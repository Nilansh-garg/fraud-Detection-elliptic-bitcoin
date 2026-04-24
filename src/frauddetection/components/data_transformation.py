import os
import torch
from src.frauddetection import logger
from torch_geometric.datasets import EllipticBitcoinDataset
from src.frauddetection.config.configuration import DataTransformationConfig

class DataTransformation:
    def __init__(self, config: DataTransformationConfig):
        self.config = config

    def initiate_data_transformation(self):
        try:
            # Load the dataset from the ingestion artifacts
            dataset = EllipticBitcoinDataset(root=self.config.data_path)
            data = dataset[0]

            # 1. Identify indices for each class
            illicit_indices = torch.where(data.y == 1)[0]
            licit_indices = torch.where(data.y == 2)[0]

            # 2. Sort by Time Step (feature index 0) to maintain temporal integrity
            illicit_time = data.x[illicit_indices, 0]
            sorted_illicit = illicit_indices[torch.argsort(illicit_time)]

            licit_time = data.x[licit_indices, 0]
            sorted_licit = licit_indices[torch.argsort(licit_time)]

            # 3. Apply 80/20 split for BOTH classes separately
            split_idx_illicit = int(0.8 * len(sorted_illicit))
            train_illicit = sorted_illicit[:split_idx_illicit]
            test_illicit = sorted_illicit[split_idx_illicit:]

            split_idx_licit = int(0.8 * len(sorted_licit))
            train_licit = sorted_licit[:split_idx_licit]
            test_licit = sorted_licit[split_idx_licit:]

            # 4. Create and assign boolean masks
            data.train_mask = torch.zeros(data.num_nodes, dtype=torch.bool)
            data.test_mask = torch.zeros(data.num_nodes, dtype=torch.bool)

            data.train_mask[train_illicit] = True
            data.train_mask[train_licit] = True
            data.test_mask[test_illicit] = True
            data.test_mask[test_licit] = True
            # 5. Convert labels to binary (1 for illicit, 0 for licit)
            data.y_binary = (data.y == 1).long()  # 1 for illicit
            
            logger.info("Successfully applied temporal splitting and binary labeling.")
            
            # Save the processed object or masks
            torch.save(data, os.path.join(self.config.root_dir, "transformed_data.pt"))
            
        except Exception as e:
            raise e