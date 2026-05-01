import torch
import pandas as pd
import numpy as np
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
        transaction_ids: A list of IDs (e.g., [2304203, 2304205])
        feature_csv_path: Path to 'elliptic_txs_features.csv'
        edge_csv_path: Path to 'elliptic_txs_edgelist.csv'
        """
        try:
            # 1. Load the raw data
            logger.info(f"Loading features from {feature_csv_path}")
            # The features CSV has no headers
            df_features = pd.read_csv(feature_csv_path, header=None)
            
            # Manually name the first column to avoid KeyError 'txId'
            df_features.rename(columns={0: 'txId'}, inplace=True)
            
            # Load edges
            df_edges = pd.read_csv(edge_csv_path)

            # 2. Check if IDs exist and map them to internal indices
            indices = []
            valid_ids = []
            
            search_ids = [int(tid) for tid in transaction_ids]
            
            for tx_id in search_ids:
                if tx_id in df_features['txId'].values:
                    idx = df_features[df_features['txId'] == tx_id].index[0]
                    indices.append(idx)
                    valid_ids.append(tx_id)
                else:
                    logger.warning(f"Transaction ID {tx_id} not found in dataset.")

            if not indices:
                return {"error": "No valid Transaction IDs found in the dataset."}

            # 3. Prepare Graph Data (Tensors)
            # FIX: Use .iloc[:, 2:] to drop both 'txId' (index 0) and 'timestep' (index 1)
            # This ensures we have exactly 165 features for the model
            x_data = df_features.iloc[:, 2:].values 
            x = torch.tensor(x_data, dtype=torch.float)
            
            logger.info(f"Input tensor shape: {x.shape}") 

            # Map raw txIds in edge list to 0-indexed positions for the tensor
            id_map = {val: i for i, val in enumerate(df_features['txId'].values)}
            
            edge_index_mapped = df_edges[
                df_edges['txId1'].isin(id_map) & df_edges['txId2'].isin(id_map)
            ].copy()
            
            edge_index_mapped['txId1'] = edge_index_mapped['txId1'].map(id_map)
            edge_index_mapped['txId2'] = edge_index_mapped['txId2'].map(id_map)
            
            edge_index = torch.tensor(edge_index_mapped.values.T, dtype=torch.long)

            # 4. Load Model
            logger.info("Initializing model and loading weights...")
            model = FraudSAGE(
                in_channels=self.params.IN_CHANNELS, # Must be 165
                hidden_channels=self.params.HIDDEN_CHANNELS,
                out_channels=self.params.OUT_CHANNELS
            )
            
            model.load_state_dict(
                torch.load(self.training_config.trained_model_path, map_location=torch.device('cpu'), weights_only=False)
            )
            model.eval()

            # 5. Run Inference
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
                        "Raw_Class": pred_class
                    }
                
            return results

        except Exception as e:
            logger.error(f"Prediction Pipeline Error: {str(e)}")
            raise e