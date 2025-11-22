import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration management for the ingestion service."""
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # Webhook Configuration
    WEBHOOK_URL: str = os.getenv(
        "WEBHOOK_URL", 
        "https://xkcomymfasugmwrkrewa.supabase.co/functions/v1/client-data-webhook"
    )
    WEBHOOK_AUTH_TOKEN: Optional[str] = os.getenv("WEBHOOK_AUTH_TOKEN")
    
    # Advisor Configuration
    ADVISOR_NAME: str = os.getenv("ADVISOR_NAME", "Andrea Paynter")
    
    @classmethod
    def validate(cls):
        """Validate that critical configuration variables are present."""
        missing = []
        if not cls.OPENAI_API_KEY:
            missing.append("OPENAI_API_KEY")
        if not cls.WEBHOOK_AUTH_TOKEN:
            missing.append("WEBHOOK_AUTH_TOKEN")
            
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

