import torch
from pathlib import Path
import torch.nn as nn
from src.frauddetection import logger
import torch_geometric
import torch_geometric.data.data
import torch_geometric.data.storage
from src.frauddetection.config.configuration import TrainingConfig
torch.serialization.add_safe_globals([
    torch_geometric.data.data.DataTensorAttr,
    torch_geometric.data.data.DataEdgeAttr,
    torch_geometric.data.storage.GlobalStorage,
    # You might also need these depending on your PyG version:
    # torch_geometric.data.Data, 
    # torch_geometric.data.storage.EdgeStorage 
])

class Training:
    def __init__(self, config: TrainingConfig):
        self.config = config

    def get_base_model(self, model_class):
        # Initialize architecture and load weights
        self.model = model_class(
            in_channels=165, # Standard for Elliptic
            hidden_channels=64,
            out_channels=2
        )
        self.model.load_state_dict(torch.load(self.config.updated_base_model_path))
        self.model.train()

    def train(self):
        data = torch.load(self.config.data_path)
        data = data.to(self.config.device)
        self.model = self.model.to(self.config.device)
        
        optimizer = torch.optim.Adam(self.model.parameters(), lr=self.config.params_lr)

        # --- NEW: Calculate weights for class imbalance ---
        # We count how many licit (0) and illicit (1) nodes are in the training set
        n_licit = (data.y_binary[data.train_mask] == 0).sum().item()
        n_illicit = (data.y_binary[data.train_mask] == 1).sum().item()
        
        # We give the 'Illicit' class a higher weight: (n_licit / n_illicit)
        # Typically this weight is around 9.0 to 12.0 for this dataset
        weights = torch.tensor([1.0, n_licit / n_illicit]).to(self.config.device)
        criterion = torch.nn.CrossEntropyLoss(weight=weights)
        # --------------------------------------------------

        self.model.train()
        for epoch in range(self.config.params_epochs):
            optimizer.zero_grad()
            out = self.model(data.x, data.edge_index)
            
            # Use the weighted criterion
            loss = criterion(out[data.train_mask], data.y_binary[data.train_mask])
            
            loss.backward()
            optimizer.step()

            if epoch % 10 == 0:
                logger.info(f"Epoch {epoch}: Loss {loss.item():.4f}")

        self.save_model(self.model, self.config.trained_model_path)

    @staticmethod
    def save_model(model: torch.nn.Module, path: Path):
        torch.save(model.state_dict(), path)
        logger.info(f"Trained model saved at: {path}")