import torch
import torch.nn as nn
from pathlib import Path
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from src.frauddetection import logger
from src.frauddetection.config.configuration import PrepareBaseModelConfig

class FraudSAGE(torch.nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels):
        super(FraudSAGE, self).__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.bn1 = nn.BatchNorm1d(hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, out_channels)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = self.bn1(x)
        x = F.relu(x)
        x = F.dropout(x, p=0.5, training=self.training)
        x = self.conv2(x, edge_index)
        return x

class PrepareBaseModel:
    def __init__(self, config: PrepareBaseModelConfig):
        self.config = config

    def get_base_model(self):
        self.model = FraudSAGE(
            in_channels=self.config.in_channels,
            hidden_channels=self.config.hidden_channels,
            out_channels=self.config.out_channels
        )
        
        self.save_model(path=self.config.base_model_path, model=self.model)

    @staticmethod
    def save_model(path: Path, model: torch.nn.Module):
        torch.save(model.state_dict(), path)
        logger.info(f"Base model saved at: {path}")