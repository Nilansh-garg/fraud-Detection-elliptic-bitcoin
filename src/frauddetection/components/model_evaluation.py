import torch
from pathlib import Path
import mlflow
import mlflow.pytorch
import torch_geometric
from sklearn.metrics import f1_score, precision_score
from src.frauddetection.utils.common import save_json
from src.frauddetection.config.configuration import EvaluationConfig
from urllib.parse import urlparse

class Evaluation:
    def __init__(self, config: EvaluationConfig):
        self.config = config

    def _load_model(self, model_class):
        model = model_class(
            in_channels=self.config.params_in_channels,
            hidden_channels=self.config.params_hidden_channels,
            out_channels=self.config.params_out_channels
        )
        model.load_state_dict(torch.load(self.config.path_of_model))
        return model

    def evaluation(self, model_class):
        # Register safe globals for graph data loading
        torch.serialization.add_safe_globals([
            torch_geometric.data.data.DataTensorAttr,
            torch_geometric.data.data.DataEdgeAttr,
            torch_geometric.data.storage.GlobalStorage
        ])
        
        self.model = self._load_model(model_class)
        self.data = torch.load(self.config.training_data)
        
        self.model.eval()
        with torch.no_grad():
            out = self.model(self.data.x, self.data.edge_index)
            pred = out.argmax(dim=1)
            
            # Masking check: Ensure test_mask has data
            y_true = self.data.y_binary[self.data.test_mask].cpu().numpy()
            y_pred = pred[self.data.test_mask].cpu().numpy()
            
            # Handling empty test sets to avoid UndefinedMetricWarning
            if len(y_true) == 0:
                print("Warning: Test mask contains no samples. Check your temporal splitting logic.")
                self.scores = {"f1_score": 0.0, "precision": 0.0}
            else:
                self.scores = {
                    "f1_score": f1_score(y_true, y_pred, zero_division=0),
                    "precision": precision_score(y_true, y_pred, zero_division=0)
                }

    # Added missing method
    def save_score(self):
        # We use a path from configuration or a default
        save_json(path=Path("scores.json"), data=self.scores)

    def log_into_mlflow(self):
        mlflow.set_registry_uri(self.config.mlflow_uri)
        tracking_url_type_store = urlparse(mlflow.get_tracking_uri()).scheme
        
        with mlflow.start_run():
            mlflow.log_params(self.config.all_params)
            mlflow.log_metrics(self.scores)
            
            if tracking_url_type_store != "file":
                mlflow.pytorch.log_model(self.model, "model", registered_model_name="FraudSAGEModel")
            else:
                mlflow.pytorch.log_model(self.model, "model")