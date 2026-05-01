import torch
import pandas as pd
from src.frauddetection.config.configuration import ConfigurationManager
from src.frauddetection.entity.model_arch import FraudSAGE
from src.frauddetection import logger

class SinglePredictionPipeline:
    def __init__(self):
        self.config_manager = ConfigurationManager()
        self.training_config = self.config_manager.get_training_config()
        self.params = self.config_manager.params

    def predict(self, transaction_ids, feature_csv_path, edge_csv_path):
        """
        transaction_ids: A list of one or two IDs (e.g., [2304203])
        """
        try:
            # 1. Load the raw data
            df_features = pd.read_csv(feature_csv_path)
            df_edges = pd.read_csv(edge_csv_path)

            # 2. Check if IDs exist and get their row indices
            indices = []
            valid_ids = []
            for tx_id in transaction_ids:
                if tx_id in df_features['txId'].values:
                    idx = df_features[df_features['txId'] == tx_id].index[0]
                    indices.append(idx)
                    valid_ids.append(tx_id)
                else:
                    logger.warning(f"Transaction ID {tx_id} not found in dataset.")

            if not indices:
                return "No valid Transaction IDs found."

            # 3. Convert whole CSV to Tensors (GNN needs context)
            # Assuming first column is txId, we drop it for features
            x = torch.tensor(df_features.drop('txId', axis=1).values, dtype=torch.float)
            edge_index = torch.tensor(df_edges.values.T, dtype=torch.long)

            # 4. Load Model
            model = FraudSAGE(
                in_channels=self.params.IN_CHANNELS,
                hidden_channels=self.params.HIDDEN_CHANNELS,
                out_channels=self.params.OUT_CHANNELS
            )
            model.load_state_dict(torch.load(self.training_config.trained_model_path, weights_only=False))
            model.eval()

            # 5. Run Prediction
            with torch.no_grad():
                out = model(x, edge_index)
                probabilities = torch.softmax(out, dim=1)
                
                results = {}
                for i, tx_id in enumerate(valid_ids):
                    node_idx = indices[i]
                    pred = out[node_idx].argmax().item()
                    conf = probabilities[node_idx][pred].item()
                    
                    results[tx_id] = {
                        "Result": "Illicit" if pred == 1 else "Licit",
                        "Confidence": f"{conf:.2%}"
                    }
                
            return results

        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise e