import argparse
import logging
import sys
import json
from datetime import datetime
from pathlib import Path

from ingestion.config import Config
from ingestion.pdf_parser import PDFParser
from ingestion.ai_processor import AIProcessor
from ingestion.data_processor import DataProcessor
from ingestion.webhook_client import WebhookClient
from ingestion.models import WebhookPayload

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Process financial planning PDFs and send data to webhook.")
    parser.add_argument("pdf_path", help="Path to the PDF file to process")
    args = parser.parse_args()

    try:
        # 1. Validate Config & Input
        Config.validate()
        pdf_path = Path(args.pdf_path)
        if not pdf_path.exists():
            logger.error(f"File not found: {pdf_path}")
            sys.exit(1)

        # 2. Parse PDF
        logger.info("Step 1: Extracting text from PDF...")
        parser = PDFParser(str(pdf_path))
        raw_text = parser.extract_text()
        
        # 3. AI Processing
        logger.info("Step 2: Running AI processing pipeline...")
        ai = AIProcessor()
        
        # Step A: Collate Info
        collated_assets = ai.step_a_collate_assets(raw_text)
        
        # Step B: Identify Reasons
        reasons_raw = ai.step_b_identify_reasons(raw_text)
        
        # Step C: Convert Flags (Not strictly used in final JSON but part of logic flow/checks)
        # flags_raw = ai.step_c_convert_flags(reasons_raw) # Optional validation step
        
        # Step D: Client Names (Can be derived from core data or specific call)
        # names_summary = ai.extract_client_names(raw_text)

        # Core Data Extraction
        core_data_json = ai.extract_core_data(raw_text)
        try:
            core_data = json.loads(core_data_json)
        except json.JSONDecodeError:
            logger.error("Failed to parse core data JSON")
            core_data = {}

        # Asset Extraction
        lifestyle_json = ai.extract_lifestyle_assets(collated_assets)
        investment_json = ai.extract_investment_assets(collated_assets)
        super_json = ai.extract_superannuation_assets(collated_assets)
        vehicle_desc = ai.extract_vehicle_descriptions(collated_assets)

        # 4. Data Processing & formatting
        logger.info("Step 3: Processing and validating data...")
        dp = DataProcessor()
        
        lifestyle_data = dp.process_lifestyle_assets(lifestyle_json)
        investment_data = dp.process_investment_assets(investment_json)
        super_data = dp.process_superannuation_assets(super_json)
        
        total_assets = dp.calculate_total_assets(lifestyle_data, investment_data, super_data)
        
        # Construct Final Payload
        payload_dict = {
            "client1_name": core_data.get("client1_name", ""),
            "client2_name": core_data.get("client2_name", ""),
            "consultation_date": datetime.now().strftime("%Y/%m/%d"), # Default to now, or extract?
            "advisor_name": Config.ADVISOR_NAME,
            
            "client1_gross_salary": str(dp.clean_number(core_data.get("client1_gross_salary", 0))),
            "client1_super_balance": super_data.get("client1_super_balance", "0"),
            "client2_gross_salary": str(dp.clean_number(core_data.get("client2_gross_salary", 0))),
            "client2_super_balance": super_data.get("client2_super_balance", "0"),
            
            "client1_health": core_data.get("client1_health", ""),
            "client2_health": core_data.get("client2_health", ""),
            "client1_work_status": core_data.get("client1_work_status", ""),
            "client2_work_status": core_data.get("client2_work_status", ""),
            
            "client1_income_tax": str(dp.clean_number(core_data.get("client1_income_tax", 0))),
            "client2_income_tax": str(dp.clean_number(core_data.get("client2_income_tax", 0))),
            "client1_centrelink_received": str(dp.clean_number(core_data.get("client1_centrelink_benefits", 0))),
            "client2_centrelink_received": str(dp.clean_number(core_data.get("client2_centrelink_benefits", 0))),
            
            "total_living_expenses": str(dp.clean_number(core_data.get("total_living_expenses", 0))),
            "reasons_for_seeking_advice": reasons_raw, # Semicolon separated string
            
            # Merged Asset Data
            **lifestyle_data,
            "vehicle_description_1": vehicle_desc.split(';')[0] if vehicle_desc else "",
            "vehicle_description_2": vehicle_desc.split(';')[1] if vehicle_desc and ';' in vehicle_desc else "",
            
            **investment_data,
            **super_data,
            
            "total_assets": total_assets,
            
            "client1_dob": dp.format_date(core_data.get("client1_dob", "")),
            "client2_dob": dp.format_date(core_data.get("client2_dob", ""))
        }
        
        # Validate with Pydantic
        payload = WebhookPayload(**payload_dict)
        
        # 5. Send to Webhook
        logger.info("Step 4: Sending data to webhook...")
        client = WebhookClient()
        if client.send_data(payload):
            logger.info("Processing completed successfully!")
        else:
            logger.error("Processing failed at webhook stage.")
            sys.exit(1)

    except Exception as e:
        logger.critical(f"Unhandled error: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()

