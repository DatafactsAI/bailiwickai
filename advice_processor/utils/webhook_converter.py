"""
Utility to convert WebhookPayload format to ClientData format
"""
from typing import Optional
from models.data_models import (
    ClientData, ClientInfo, ClientInfoPair, FinancialSummary,
    DetailedAssets, DetailedLiabilities, DetailedInsurance,
    AdviceContext, AdvisorInput,
    LifestyleAsset, InvestmentAsset, SuperannuationAsset, Loan, InsurancePolicy
)


def convert_webhook_to_client_data(payload_dict: dict, client_id: Optional[str] = None) -> ClientData:
    """
    Convert WebhookPayload dictionary to ClientData model.
    
    Args:
        payload_dict: Dictionary from process_fact_find_pdf (WebhookPayload format)
        client_id: Optional client ID. If not provided, generates one from client1_name
        
    Returns:
        ClientData model instance
    """
    import uuid
    from datetime import datetime
    
    # Generate client ID if not provided
    if not client_id:
        client1_name = payload_dict.get("client1_name", "").strip()
        if client1_name:
            # Create ID from name (sanitized)
            client_id = client1_name.lower().replace(" ", "_").replace(",", "")[:20]
            # Add random suffix to ensure uniqueness
            client_id = f"{client_id}_{uuid.uuid4().hex[:8]}"
        else:
            client_id = f"client_{uuid.uuid4().hex[:12]}"
    
    def safe_float(value) -> float:
        """Safely convert string to float"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Remove commas, dollar signs, etc.
            cleaned = value.replace(",", "").replace("$", "").replace(" ", "").strip()
            try:
                return float(cleaned) if cleaned else 0.0
            except (ValueError, TypeError):
                return 0.0
        return 0.0
    
    def safe_str(value) -> str:
        """Safely convert to string"""
        if value is None:
            return ""
        return str(value).strip()
    
    # Build ClientInfo
    client1 = ClientInfo(
        name=safe_str(payload_dict.get("client1_name", "")),
        dob=safe_str(payload_dict.get("client1_dob", "")),
        grossSalary=safe_float(payload_dict.get("client1_gross_salary", 0)),
        superBalance=safe_float(payload_dict.get("client1_super_balance", 0)),
        health=safe_str(payload_dict.get("client1_health", "")),
        workStatus=safe_str(payload_dict.get("client1_work_status", "")),
        incomeTax=safe_float(payload_dict.get("client1_income_tax", 0)),
        centrelinkReceived=safe_float(payload_dict.get("client1_centrelink_received", 0)),
    )
    
    client2 = None
    if payload_dict.get("client2_name"):
        client2 = ClientInfo(
            name=safe_str(payload_dict.get("client2_name", "")),
            dob=safe_str(payload_dict.get("client2_dob", "")),
            grossSalary=safe_float(payload_dict.get("client2_gross_salary", 0)),
            superBalance=safe_float(payload_dict.get("client2_super_balance", 0)),
            health=safe_str(payload_dict.get("client2_health", "")),
            workStatus=safe_str(payload_dict.get("client2_work_status", "")),
            incomeTax=safe_float(payload_dict.get("client2_income_tax", 0)),
            centrelinkReceived=safe_float(payload_dict.get("client2_centrelink_received", 0)),
        )
    
    client_info = ClientInfoPair(
        client1=client1,
        client2=client2,
        consultationDate=safe_str(payload_dict.get("consultation_date", datetime.now().strftime("%Y/%m/%d"))),
        advisorName=safe_str(payload_dict.get("advisor_name", "")),
    )
    
    # Build FinancialSummary
    financial_summary = FinancialSummary(
        totalLifestyleAssets=safe_float(payload_dict.get("lifestyle_assets_total_value", 0)),
        totalLivingExpenses=safe_float(payload_dict.get("total_living_expenses", 0)),
        totalInvestmentAssets=safe_float(payload_dict.get("investment_assets_total_value", 0)),
        totalSuperannuationAssets=safe_float(payload_dict.get("total_superannuation_assets", 0)),
        totalClientLoans=0.0,  # Not in webhook payload, will be 0
        totalClientInsurance=0.0,  # Not in webhook payload, will be 0
    )
    
    # Build DetailedAssets - Lifestyle Assets
    lifestyle_assets = []
    for i in range(1, 6):
        desc = safe_str(payload_dict.get(f"lifestyle_asset_{i}_description", ""))
        value = safe_float(payload_dict.get(f"lifestyle_asset_value_{i}", 0))
        if desc or value > 0:
            lifestyle_assets.append(LifestyleAsset(
                name=desc or f"Lifestyle Asset {i}",
                value=value,
                owner="Client 1"  # Default, can be updated later
            ))
    
    # Investment Assets
    investment_assets = []
    for i in range(1, 5):
        exists = safe_str(payload_dict.get(f"investment_asset_{i}_exist", "")).lower()
        if exists in ["yes", "true", "1"]:
            desc = safe_str(payload_dict.get(f"investment_asset_{i}_description", ""))
            value = safe_float(payload_dict.get(f"investment_asset_{i}_value", 0))
            if desc or value > 0:
                investment_assets.append(InvestmentAsset(
                    name=desc or f"Investment Asset {i}",
                    value=value,
                    owner="Client 1",  # Default
                    returnRate=None
                ))
    
    # Superannuation Assets
    superannuation_assets = []
    for i in range(1, 6):
        exists = safe_str(payload_dict.get(f"superannuation_asset_{i}_exists", "")).lower()
        if exists in ["yes", "true", "1"]:
            desc = safe_str(payload_dict.get(f"superannuation_asset_{i}_description", ""))
            value = safe_float(payload_dict.get(f"superannuation_asset_{i}_value", 0))
            owner = safe_str(payload_dict.get(f"superannuation_asset_{i}_owner", "Client 1"))
            if desc or value > 0:
                superannuation_assets.append(SuperannuationAsset(
                    owner=owner,
                    fundName=desc or f"Super Fund {i}",
                    balance=value,
                    investmentOption=""  # Not in webhook payload
                ))
    
    detailed_assets = DetailedAssets(
        lifestyleAssets=lifestyle_assets,
        investmentAssets=investment_assets,
        superannuationAssets=superannuation_assets,
    )
    
    # Build empty DetailedLiabilities and DetailedInsurance (not in webhook payload)
    detailed_liabilities = DetailedLiabilities(loans=[])
    detailed_insurance = DetailedInsurance(policies=[])
    
    # Build AdviceContext
    advice_context = AdviceContext(
        reasonsForAdvice=safe_str(payload_dict.get("reasons_for_seeking_advice", "")),
        currentSituation="",  # Not in webhook payload
        concerns="",  # Not in webhook payload
    )
    
    # Build AdvisorInput (empty initially)
    advisor_input = AdvisorInput(
        analysis="",
        recommendations="",
        strategies="",
        nextSteps="",
    )
    
    return ClientData(
        id=client_id,
        clientInfo=client_info,
        financialSummary=financial_summary,
        detailedAssets=detailed_assets,
        detailedLiabilities=detailed_liabilities,
        detailedInsurance=detailed_insurance,
        adviceContext=advice_context,
        advisorInput=advisor_input,
    )


