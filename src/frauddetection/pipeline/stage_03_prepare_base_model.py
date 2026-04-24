from frauddetection.config.configuration import ConfigurationManager
from frauddetection.components.prepare_base_model import PrepareBaseModel
from frauddetection import logger

STAGE_NAME = "PREPARE BASE MODEL STAGE"

class PrepareBaseModelPipeline:
    def __init__(self):
        pass
    
    def main(self):
        try:
            config = ConfigurationManager()
            prepare_base_model_config = config.get_prepare_base_model_config()
            prepare_base_model = PrepareBaseModel(config=prepare_base_model_config)
            prepare_base_model.get_base_model()
        except Exception as e:
            raise e
        

if __name__ == "__main__":
    try:
        logger.info(f"*******************")
        logger.info(f">>>>>> Stage: {STAGE_NAME} started <<<<<<")
        obj = PrepareBaseModelPipeline()
        obj.main()
        logger.info(f">>>>>> Stage: {STAGE_NAME} completed <<<<<<\n\nx==========x")
    except Exception as e:
        logger.exception(e)
        raise e
    