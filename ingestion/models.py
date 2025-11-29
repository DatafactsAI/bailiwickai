from pydantic import BaseModel, Field
from typing import Optional, Any

class WebhookPayload(BaseModel):
    """
    Pydantic model matching the exact JSON structure required by the webhook.
    All fields are strings based on the spec, even numeric ones.
    """
    client1_name: str = Field(default="")
    client2_name: str = Field(default="")
    consultation_date: str = Field(default="")
    advisor_name: str = Field(default="")
    
    client1_gross_salary: str = Field(default="")
    client1_super_balance: str = Field(default="0")
    client2_gross_salary: str = Field(default="")
    client2_super_balance: str = Field(default="0")
    
    client1_health: str = Field(default="")
    client2_health: str = Field(default="")
    client1_work_status: str = Field(default="")
    client2_work_status: str = Field(default="")
    
    client1_income_tax: str = Field(default="")
    client2_income_tax: str = Field(default="")
    client1_centrelink_received: str = Field(default="")
    client2_centrelink_received: str = Field(default="")
    
    total_lifestyle_assets: str = Field(default="")
    total_living_expenses: str = Field(default="")
    total_investment_assets: str = Field(default="")
    
    reasons_for_seeking_advice: str = Field(default="")
    
    # Lifestyle Assets (1-5)
    lifestyle_asset_count_1: str = Field(default="")
    lifestyle_asset_count_2: str = Field(default="")
    lifestyle_asset_count_3: str = Field(default="")
    lifestyle_asset_count_4: str = Field(default="")
    lifestyle_asset_count_5: str = Field(default="")
    
    lifestyle_asset_1_description: str = Field(default="")
    lifestyle_asset_2_description: str = Field(default="")
    lifestyle_asset_3_description: str = Field(default="")
    lifestyle_asset_4_description: str = Field(default="")
    lifestyle_asset_5_description: str = Field(default="")
    
    lifestyle_asset_value_1: str = Field(default="")
    lifestyle_asset_value_2: str = Field(default="")
    lifestyle_asset_value_3: str = Field(default="")
    lifestyle_asset_value_4: str = Field(default="")
    lifestyle_asset_value_5: str = Field(default="")
    
    lifestyle_assets_total_value: str = Field(default="")
    
    vehicle_description_1: str = Field(default="")
    vehicle_description_2: str = Field(default="") # Note: Spec only shows 1 & 2 for vehicles?
    
    # Investment Assets (1-4)
    investment_asset_1_exist: str = Field(default="")
    investment_asset_2_exist: str = Field(default="")
    investment_asset_3_exist: str = Field(default="")
    investment_asset_4_exist: str = Field(default="")
    
    investment_asset_1_description: str = Field(default="")
    investment_asset_2_description: str = Field(default="")
    investment_asset_3_description: str = Field(default="")
    investment_asset_4_description: str = Field(default="")
    
    investment_asset_1_value: str = Field(default="")
    investment_asset_2_value: str = Field(default="")
    investment_asset_3_value: str = Field(default="")
    investment_asset_4_value: str = Field(default="")
    
    investment_assets_total_value: str = Field(default="")
    
    # Superannuation Assets (1-5)
    superannuation_asset_1_exists: str = Field(default="")
    superannuation_asset_2_exists: str = Field(default="")
    superannuation_asset_3_exists: str = Field(default="")
    superannuation_asset_4_exists: str = Field(default="")
    superannuation_asset_5_exists: str = Field(default="")
    
    superannuation_asset_1_owner: str = Field(default="")
    superannuation_asset_2_owner: str = Field(default="")
    superannuation_asset_3_owner: str = Field(default="")
    superannuation_asset_4_owner: str = Field(default="")
    superannuation_asset_5_owner: str = Field(default="")
    
    superannuation_asset_1_description: str = Field(default="")
    superannuation_asset_2_description: str = Field(default="")
    superannuation_asset_3_description: str = Field(default="")
    superannuation_asset_4_description: str = Field(default="")
    superannuation_asset_5_description: str = Field(default="")
    
    superannuation_asset_1_value: str = Field(default="")
    superannuation_asset_2_value: str = Field(default="")
    superannuation_asset_3_value: str = Field(default="")
    superannuation_asset_4_value: str = Field(default="")
    superannuation_asset_5_value: str = Field(default="")
    
    total_superannuation_assets: str = Field(default="")
    
    total_assets: str = Field(default="")
    
    client1_dob: str = Field(default="")
    client2_dob: str = Field(default="")



