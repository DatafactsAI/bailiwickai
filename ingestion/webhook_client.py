import requests
import logging
import time
from typing import Dict, Any
from .config import Config
from .models import WebhookPayload

logger = logging.getLogger(__name__)

class WebhookClient:
    """Handles sending processed data to the Supabase webhook."""
    
    def __init__(self):
        self.url = Config.WEBHOOK_URL
        self.headers = {
            "Authorization": Config.WEBHOOK_AUTH_TOKEN,
            "Content-Type": "application/json"
        }

    def send_data(self, payload: WebhookPayload) -> bool:
        """
        Sends the JSON payload to the configured webhook.
        
        Args:
            payload: Validated WebhookPayload object.
            
        Returns:
            bool: True if successful, False otherwise.
        """
        data = payload.model_dump()
        
        logger.info(f"Sending data to webhook: {self.url}")
        
        # Retry logic (simple exponential backoff)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    self.url,
                    json=data,
                    headers=self.headers,
                    timeout=30
                )
                
                if response.status_code in (200, 201):
                    logger.info("Webhook submission successful.")
                    return True
                else:
                    logger.error(
                        f"Webhook failed (Attempt {attempt+1}/{max_retries}): "
                        f"Status {response.status_code} - {response.text}"
                    )
                    
            except requests.RequestException as e:
                logger.error(f"Network error (Attempt {attempt+1}/{max_retries}): {str(e)}")
            
            if attempt < max_retries - 1:
                sleep_time = 2 ** attempt
                time.sleep(sleep_time)
                
        return False

