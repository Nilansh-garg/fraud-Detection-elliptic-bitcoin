import os
from torch_geometric.datasets import EllipticBitcoinDataset
from src.frauddetection import logger
from src.frauddetection.config.configuration import DataIngestionConfig

class DataIngestion:
    def __init__(self, config: DataIngestionConfig):
        self.config = config
        
    def download_dataset(self):
        """
        Downloads and loads the Elliptic Bitcoin dataset into the artifacts directory.
        """
        try:
            dataset_path = self.config.local_data_path
            if not os.path.exists(dataset_path):
                logger.info(f"Downloading dataset to {dataset_path}...")
                dataset = EllipticBitcoinDataset(root=dataset_path)
                logger.info(f"Dataset downloaded successfully at: {os.path.abspath(dataset_path)}")
            else:
                logger.info(f"Dataset already exists at {dataset_path}")
                
        except Exception as e:
            raise e