import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    openai_api_key: str
    openai_model: str = "gpt-4o"
    log_level: str = "INFO"
    data_dir: str = "../data"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()



