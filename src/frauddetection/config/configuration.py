from src.frauddetection.constants import *
import torch
from src.frauddetection.utils.common import read_yaml, create_directories
from src.frauddetection.entity.config_entity import (DataIngestionConfig,
                                                     DataTransformationConfig,
                                                     PrepareBaseModelConfig,
                                                     TrainingConfig,
                                                     EvaluationConfig)

class ConfigurationManager:
    def __init__(
        self,
        config_filepath = CONFIG_FILE_PATH,
        params_filepath = PARAMS_FILE_PATH
    ):
        self.config = read_yaml(config_filepath)
        self.params = read_yaml(params_filepath)
        
        create_directories([self.config.artifacts_root])
        
    def get_data_ingestion_config(self) -> DataIngestionConfig:
        config = self.config.data_ingestion
        
        create_directories([config.root_dir])
        
        data_ingestion_config = DataIngestionConfig(
            root_dir=config.root_dir,
            local_data_path=config.local_data_path,
            dataset_name=config.dataset_name
        )
        
        return data_ingestion_config
    
    def get_data_transformation_config(self) -> DataTransformationConfig:
        config = self.config.data_transformation
        create_directories([config.root_dir])

        data_transformation_config = DataTransformationConfig(
            root_dir=config.root_dir,
            data_path=config.data_path,
        )

        return data_transformation_config
    
    def get_prepare_base_model_config(self) -> PrepareBaseModelConfig:
        config = self.config.prepare_base_model
        
        create_directories([config.root_dir])

        prepare_base_model_config = PrepareBaseModelConfig(
            root_dir=Path(config.root_dir),
            base_model_path=Path(config.base_model_path),
            in_channels=self.params.IN_CHANNELS,
            hidden_channels=self.params.HIDDEN_CHANNELS,
            out_channels=self.params.OUT_CHANNELS
        )

        return prepare_base_model_config
    
    def get_training_config(self) -> TrainingConfig:
        training = self.config.model_training
        prepare_base_model = self.config.prepare_base_model
        transformation = self.config.data_transformation
        
        create_directories([training.root_dir])
        
        device = "cuda" if torch.cuda.is_available() else "cpu"

        training_config = TrainingConfig(
            root_dir=Path(training.root_dir),
            trained_model_path=Path(training.trained_model_path),
            updated_base_model_path=Path(prepare_base_model.base_model_path),
            data_path=Path(transformation.trained_data_path),
            params_epochs=self.params.EPOCHS,
            params_lr=self.params.LEARNING_RATE,
            device=device
        )

        return training_config
    
    def get_evaluation_config(self) -> EvaluationConfig:
        # Accessing the model_evaluation section from config.yaml
        eval_config = self.config.model_evaluation
        
        create_directories([Path(eval_config.root_dir)])

        evaluation_config = EvaluationConfig(
            path_of_model=Path(eval_config.model_path),
            training_data=Path(eval_config.data_path),
            all_params=self.params,
            mlflow_uri="https://dagshub.com/Nilansh-garg/fraud-Detection-elliptic-bitcoin.mlflow", # Keep this or move to a separate secret/config
            params_in_channels=self.params.IN_CHANNELS,
            params_hidden_channels=self.params.HIDDEN_CHANNELS,
            params_out_channels=self.params.OUT_CHANNELS
        )
        return evaluation_config