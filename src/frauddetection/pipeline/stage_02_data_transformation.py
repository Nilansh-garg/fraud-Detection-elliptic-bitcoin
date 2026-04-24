import os
from pathlib import Path
import os
from frauddetection.components.data_ingestion import DataIngestion
from frauddetection.config.configuration import ConfigurationManager
from src.frauddetection.components.data_transformation import DataTransformation
from src.frauddetection import logger
import os
from pathlib import Path

STAGE_NAME = "DATA TRANSFORMATION STAGE"

class DataTransformationTrainingPipeline:
    def __init__(self):
        pass
    
    def main(self):
        try:
            config = ConfigurationManager()
            data_transformation_config = config.get_data_transformation_config()
            data_transformation = DataTransformation(config=data_transformation_config)
            data_transformation.initiate_data_transformation()
        except Exception as e:
            raise e
                
if __name__ == "__main__":
    try:
        logger.info(f">>>>>>>>>>>>stage {STAGE_NAME} started<<<<<<<<<<<<")
        obj = DataTransformationTrainingPipeline()
        obj.main()
        logger.info(f">>>>>>>>>>>> stage {STAGE_NAME} completed <<<<<<<<<<<<\n\nx==========x")
    except Exception as e:
        logger.exception(e)
        raise e