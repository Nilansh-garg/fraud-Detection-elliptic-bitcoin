import os
import torch
import pandas as pd
import numpy as np
from huggingface_hub import hf_hub_download
from src.frauddetection.config.configuration import ConfigurationManager
from src.frauddetection.entity.model_arch import FraudSAGE
from src.frauddetection import logger

# ── Model storage ─────────────────────────────────────────────────────────────
HF_REPO_ID = "Nilansh-garg/fraud-detection-model"
MODEL_FILENAME = "model.pt"
MODEL_LOCAL_DIR = "artifacts/model_training"
MODEL_LOCAL_PATH = os.path.join(MODEL_LOCAL_DIR, MODEL_FILENAME)


def download_model_if_needed():
    if not os.path.exists(MODEL_LOCAL_PATH):
        logger.info(f"Downloading model from HF Hub: {HF_REPO_ID}")
        os.makedirs(MODEL_LOCAL_DIR, exist_ok=True)
        hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=MODEL_FILENAME,
            local_dir=MODEL_LOCAL_DIR,
            repo_type="model",
        )
        logger.info("Model downloaded successfully.")
    else:
        logger.info("Model already cached locally. Skipping download.")


class SinglePredictionPipeline:
    def __init__(self):
        self.config_manager = ConfigurationManager()
        self.training_config = self.config_manager.get_training_config()
        self.params = self.config_manager.params

    def predict(self, transaction_ids, feature_csv_path, edge_csv_path):
        try:
            download_model_if_needed()

            logger.info(f"Loading features from {feature_csv_path}")
            df_features = pd.read_csv(feature_csv_path, header=None)
            df_features.rename(columns={0: "txId"}, inplace=True)
            df_edges = pd.read_csv(edge_csv_path)

            indices = []
            valid_ids = []
            search_ids = [int(tid) for tid in transaction_ids]

            for tx_id in search_ids:
                if tx_id in df_features["txId"].values:
                    idx = df_features[df_features["txId"] == tx_id].index[0]
                    indices.append(idx)
                    valid_ids.append(tx_id)
                else:
                    logger.warning(f"Transaction ID {tx_id} not found in dataset.")

            if not indices:
                return {"error": "No valid Transaction IDs found in the dataset."}

            x_data = df_features.iloc[:, 2:].values
            x = torch.tensor(x_data, dtype=torch.float)
            logger.info(f"Input tensor shape: {x.shape}")

            id_map = {val: i for i, val in enumerate(df_features["txId"].values)}
            edge_index_mapped = df_edges[
                df_edges["txId1"].isin(id_map) & df_edges["txId2"].isin(id_map)
            ].copy()
            edge_index_mapped["txId1"] = edge_index_mapped["txId1"].map(id_map)
            edge_index_mapped["txId2"] = edge_index_mapped["txId2"].map(id_map)
            edge_index = torch.tensor(edge_index_mapped.values.T, dtype=torch.long)

            logger.info("Initializing model and loading weights...")
            model = FraudSAGE(
                in_channels=self.params.IN_CHANNELS,
                hidden_channels=self.params.HIDDEN_CHANNELS,
                out_channels=self.params.OUT_CHANNELS,
            )
            model.load_state_dict(
                torch.load(MODEL_LOCAL_PATH, map_location=torch.device("cpu"), weights_only=False)
            )
            model.eval()

            logger.info(f"Running prediction for {len(valid_ids)} nodes...")
            with torch.no_grad():
                out = model(x, edge_index)
                probabilities = torch.softmax(out, dim=1)
                results = {}
                for i, tx_id in enumerate(valid_ids):
                    node_idx = indices[i]
                    pred_class = out[node_idx].argmax().item()
                    confidence = probabilities[node_idx][pred_class].item()
                    results[str(tx_id)] = {
                        "txId": int(tx_id),
                        "Result": "Illicit" if pred_class == 1 else "Licit",
                        "Confidence": f"{confidence:.2%}",
                        "Raw_Class": pred_class,
                    }
            return results

        except Exception as e:
            logger.error(f"Prediction Pipeline Error: {str(e)}")
            raise e
