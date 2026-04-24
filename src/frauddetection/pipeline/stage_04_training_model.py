import os
from pathlib import Path
import os
from frauddetection.config.configuration import ConfigurationManager
from src.frauddetection.components.training_model import Training
from src.frauddetection import logger
from src.frauddetection.entity.model_arch import FraudSAGE



import os
from pathlib import Path

STAGE_NAME = "DATA TRAINING STAGE"

class DataTrainingPipeline:
    def __init__(self):
        pass
    
    def main(self):
        try:
            config = ConfigurationManager()
            training_config = config.get_training_config()
            training = Training(config=training_config)
            
            # Passing the class definition from the previous stage
            training.get_base_model(FraudSAGE) 
            training.train()
        except Exception as e:
            raise e
                
if __name__ == "__main__":
    try:
        logger.info(f">>>>>>>>>>>>stage {STAGE_NAME} started<<<<<<<<<<<<")
        obj = DataTrainingPipeline()
        obj.main()
        logger.info(f">>>>>>>>>>>> stage {STAGE_NAME} completed <<<<<<<<<<<<\n\nx==========x")
    except Exception as e:
        logger.exception(e)
        raise e