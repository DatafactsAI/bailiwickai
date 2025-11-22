import logging
from typing import Dict, List, Any, Optional
from openai import OpenAI
from .config import Config

logger = logging.getLogger(__name__)

class AIProcessor:
    """Handles interaction with OpenAI API to process document data."""
    
    def __init__(self):
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = Config.OPENAI_MODEL
        
    def _call_openai(self, prompt: str, system_prompt: str = "You are a helpful financial data extraction assistant.") -> str:
        """Helper method to call OpenAI API."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise

    def step_a_collate_assets(self, text: str) -> str:
        """Step A: Collate Asset Information"""
        prompt = (
            f"Below is a set of data from a scanned document that relates to a clients assets. "
            f"your task is to present the information clearly and accurately so it can be read "
            f"by an AI in the next stages in the process:\n\n{text}"
        )
        return self._call_openai(prompt)

    def step_b_identify_reasons(self, text: str) -> str:
        """Step B: Identify Reasons for Seeking Advice"""
        prompt = (
            "Read the attached statement and tell me if the reasons for seeking advice are any of the following. "
            "The person providing the information may not specifically mention this information so you will have "
            "answer using your understanding of the information. Planning for my retirement, Saving more money, "
            "getting insurance, helping children, Estate Planning, Risk Management, Debt Management. "
            "If they are this then you should return the exact phrase above separated by a \";\". "
            "there is to be no space before or after the \";\" subsequent answers should start right next to the \";\" "
            "with no space, include no other words or symbols in your output.\n\n"
            f"Content: {text}"
        )
        return self._call_openai(prompt)

    def step_c_convert_flags(self, text: str) -> str:
        """Step C: Convert to True/False Flags"""
        prompt = (
            "read the attached output and answer the following questions as a string separated by a \";\" "
            "with no spaces in the string, especially no spaces between the words and the \";\" and any of the works,\n"
            "1. Does the following content include \"Planning for my retirement\", answer true or false\n"
            "2. Does the following content include \"Save more money\", answer true or false\n"
            "3. does the following content include \"Get insurance\", answer true or false\n"
            "4. Does the following content include \"Helping Children\", answer true or false\n"
            "5. Does the following content include \"Estate Planning\", answer true or false\n"
            "6. Does the following content include \"Risk Management\", answer true or false\n"
            "7. Does the following content include \"Debt Management\", answer true or false\n\n"
            f"Content: {text}"
        )
        return self._call_openai(prompt)

    def extract_client_names(self, text: str) -> str:
        """Extract client names for naming summary (Step D)"""
        prompt = (
            "Extract the full names of Client 1 and Client 2 from the text. "
            "Return them separated by ' and '. If only one client, just return that name. "
            "Example: 'John Smith and Jane Smith'.\n\n"
            f"Text: {text}"
        )
        return self._call_openai(prompt)
        
    def extract_lifestyle_assets(self, text: str) -> str:
        """Extract lifestyle asset details (Step F)"""
        prompt = (
            "Extract up to 5 lifestyle assets (cars, caravans, boats, etc.). "
            "For each, provide Description, Owner, and Value. "
            "Format as JSON array: [{'description': '', 'owner': '', 'value': ''}]. "
            "If no assets, return empty array [].\n\n"
            f"Text: {text}"
        )
        # Note: Using JSON mode if available or reliable prompting
        return self._call_openai(prompt, system_prompt="You are a data extraction assistant. Return only valid JSON.")

    def extract_investment_assets(self, text: str) -> str:
        """Extract investment asset details (Step I)"""
        prompt = (
            "Extract up to 4 investment assets. "
            "For each, provide Description, Value, and Owner. "
            "Format as JSON array: [{'description': '', 'owner': '', 'value': ''}]. "
            "If no assets, return empty array [].\n\n"
            f"Text: {text}"
        )
        return self._call_openai(prompt, system_prompt="You are a data extraction assistant. Return only valid JSON.")

    def extract_superannuation_assets(self, text: str) -> str:
        """Extract superannuation asset details (Step J)"""
        prompt = (
            "Extract up to 5 superannuation funds. "
            "For each, provide Owner, Description (fund name), Current Value, and Investment Option. "
            "Format as JSON array: [{'owner': '', 'description': '', 'value': '', 'option': ''}]. "
            "If no assets, return empty array [].\n\n"
            f"Text: {text}"
        )
        return self._call_openai(prompt, system_prompt="You are a data extraction assistant. Return only valid JSON.")

    def extract_vehicle_descriptions(self, text: str) -> str:
        """Step H: Process Vehicle Descriptions"""
        prompt = (
            "Extract descriptions of all vehicles mentioned. "
            "Return as semicolon-separated list. If none, return empty string.\n\n"
            f"Text: {text}"
        )
        return self._call_openai(prompt)

    def extract_core_data(self, text: str) -> str:
        """Extract core client and financial fields"""
        prompt = (
            "Extract the following fields as JSON:\n"
            "- client_1_name\n"
            "- client_2_name\n"
            "- client_1_dob (YYYY/MM/DD)\n"
            "- client_2_dob (YYYY/MM/DD)\n"
            "- client_1_health\n"
            "- client_2_health\n"
            "- client_1_work_status\n"
            "- client_2_work_status\n"
            "- client_1_gross_salary\n"
            "- client_2_gross_salary\n"
            "- client_1_income_tax\n"
            "- client_2_income_tax\n"
            "- client_1_centrelink_benefits\n"
            "- client_2_centrelink_benefits\n"
            "- total_living_expenses\n\n"
            f"Text: {text}"
        )
        return self._call_openai(prompt, system_prompt="You are a data extraction assistant. Return only valid JSON.")

