import os
from pathlib import Path
import os
from frauddetection.config.configuration import ConfigurationManager
from src.frauddetection.components.data_ingestion import DataIngestion
from src.frauddetection import logger
import os
from pathlib import Path

STAGE_NAME = "DATA INGESTION STAGE"

class DataIngestionTrainingPipeline:
    def __init__(self):
        pass
    
    def main(self):
        try:
            config = ConfigurationManager()
            data_ingestion_config = config.get_data_ingestion_config()
            data_ingestion = DataIngestion(config=data_ingestion_config)
            data_ingestion.download_dataset()
        except Exception as e:
            raise e
                
if __name__ == "__main__":
    try:
        logger.info(f">>>>>>>>>>>>stage {STAGE_NAME} started<<<<<<<<<<<<")
        obj = DataIngestionTrainingPipeline()
        obj.main()
        logger.info(f">>>>>>>>>>>> stage {STAGE_NAME} completed <<<<<<<<<<<<\n\nx==========x")
    except Exception as e:
        logger.exception(e)
        raise e