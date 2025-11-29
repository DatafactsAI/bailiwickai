"""
Mapping Engine - Handles auto-mapping of placeholders to client data fields.
Provides intelligent matching and field value resolution.
"""

import logging
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from models.template_models import MappingEntry

logger = logging.getLogger(__name__)


class MappingEngine:
    """
    Maps template placeholders to client data fields.
    Supports auto-mapping with confidence levels and field value resolution.
    """
    
    # Standard field mapping patterns (lowercase, normalized)
    # Key: normalized placeholder patterns, Value: (field_path, format_hint)
    FIELD_MAPPINGS: Dict[str, Tuple[str, Optional[str]]] = {
        # Client 1 fields
        "clientname": ("clientInfo.client1.name", None),
        "client1name": ("clientInfo.client1.name", None),
        "client_name": ("clientInfo.client1.name", None),
        "client1_name": ("clientInfo.client1.name", None),
        "name": ("clientInfo.client1.name", None),
        
        "clientdob": ("clientInfo.client1.dob", "date"),
        "client1dob": ("clientInfo.client1.dob", "date"),
        "client_dob": ("clientInfo.client1.dob", "date"),
        "client1_dob": ("clientInfo.client1.dob", "date"),
        "dateofbirth": ("clientInfo.client1.dob", "date"),
        "dob": ("clientInfo.client1.dob", "date"),
        
        "salary": ("clientInfo.client1.grossSalary", "currency"),
        "grosssalary": ("clientInfo.client1.grossSalary", "currency"),
        "gross_salary": ("clientInfo.client1.grossSalary", "currency"),
        "client1salary": ("clientInfo.client1.grossSalary", "currency"),
        "client1_salary": ("clientInfo.client1.grossSalary", "currency"),
        "client1_gross_salary": ("clientInfo.client1.grossSalary", "currency"),
        
        "superbalance": ("clientInfo.client1.superBalance", "currency"),
        "super_balance": ("clientInfo.client1.superBalance", "currency"),
        "super": ("clientInfo.client1.superBalance", "currency"),
        "super1": ("clientInfo.client1.superBalance", "currency"),
        "client1super": ("clientInfo.client1.superBalance", "currency"),
        "client1_super": ("clientInfo.client1.superBalance", "currency"),
        "client1_super_balance": ("clientInfo.client1.superBalance", "currency"),
        
        "health": ("clientInfo.client1.health", None),
        "client1health": ("clientInfo.client1.health", None),
        "client1_health": ("clientInfo.client1.health", None),
        
        "workstatus": ("clientInfo.client1.workStatus", None),
        "work_status": ("clientInfo.client1.workStatus", None),
        "client1workstatus": ("clientInfo.client1.workStatus", None),
        "client1_work_status": ("clientInfo.client1.workStatus", None),
        
        "incometax": ("clientInfo.client1.incomeTax", "currency"),
        "income_tax": ("clientInfo.client1.incomeTax", "currency"),
        "client1_income_tax": ("clientInfo.client1.incomeTax", "currency"),
        
        # Client 2 fields
        "client2name": ("clientInfo.client2.name", None),
        "client2_name": ("clientInfo.client2.name", None),
        
        "client2dob": ("clientInfo.client2.dob", "date"),
        "client2_dob": ("clientInfo.client2.dob", "date"),
        
        "client2salary": ("clientInfo.client2.grossSalary", "currency"),
        "client2_salary": ("clientInfo.client2.grossSalary", "currency"),
        "client2_gross_salary": ("clientInfo.client2.grossSalary", "currency"),
        
        "super2": ("clientInfo.client2.superBalance", "currency"),
        "client2super": ("clientInfo.client2.superBalance", "currency"),
        "client2_super": ("clientInfo.client2.superBalance", "currency"),
        "client2_super_balance": ("clientInfo.client2.superBalance", "currency"),
        "client2superbalance": ("clientInfo.client2.superBalance", "currency"),
        
        "client2health": ("clientInfo.client2.health", None),
        "client2_health": ("clientInfo.client2.health", None),
        
        "client2workstatus": ("clientInfo.client2.workStatus", None),
        "client2_work_status": ("clientInfo.client2.workStatus", None),
        
        # Consultation/Advisor fields
        "date": ("clientInfo.consultationDate", "date"),
        "consultationdate": ("clientInfo.consultationDate", "date"),
        "consultation_date": ("clientInfo.consultationDate", "date"),
        "meetingdate": ("clientInfo.consultationDate", "date"),
        "meeting_date": ("clientInfo.consultationDate", "date"),
        
        "advisor": ("clientInfo.advisorName", None),
        "advisorname": ("clientInfo.advisorName", None),
        "advisor_name": ("clientInfo.advisorName", None),
        
        # Financial summary fields
        "totallifestyleassets": ("financialSummary.totalLifestyleAssets", "currency"),
        "total_lifestyle_assets": ("financialSummary.totalLifestyleAssets", "currency"),
        "lifestyleassets": ("financialSummary.totalLifestyleAssets", "currency"),
        "lifestyle_assets": ("financialSummary.totalLifestyleAssets", "currency"),
        
        "totalinvestmentassets": ("financialSummary.totalInvestmentAssets", "currency"),
        "total_investment_assets": ("financialSummary.totalInvestmentAssets", "currency"),
        "investmentassets": ("financialSummary.totalInvestmentAssets", "currency"),
        "investment_assets": ("financialSummary.totalInvestmentAssets", "currency"),
        
        "totalsuperannuationassets": ("financialSummary.totalSuperannuationAssets", "currency"),
        "total_superannuation_assets": ("financialSummary.totalSuperannuationAssets", "currency"),
        "totalsuperassets": ("financialSummary.totalSuperannuationAssets", "currency"),
        "total_super_assets": ("financialSummary.totalSuperannuationAssets", "currency"),
        
        "totallivingexpenses": ("financialSummary.totalLivingExpenses", "currency"),
        "total_living_expenses": ("financialSummary.totalLivingExpenses", "currency"),
        "livingexpenses": ("financialSummary.totalLivingExpenses", "currency"),
        "living_expenses": ("financialSummary.totalLivingExpenses", "currency"),
        "expenses": ("financialSummary.totalLivingExpenses", "currency"),
        
        "totalloans": ("financialSummary.totalClientLoans", "currency"),
        "total_loans": ("financialSummary.totalClientLoans", "currency"),
        "totalclientloans": ("financialSummary.totalClientLoans", "currency"),
        "total_client_loans": ("financialSummary.totalClientLoans", "currency"),
        "loans": ("financialSummary.totalClientLoans", "currency"),
        "debt": ("financialSummary.totalClientLoans", "currency"),
        
        "totalinsurance": ("financialSummary.totalClientInsurance", "currency"),
        "total_insurance": ("financialSummary.totalClientInsurance", "currency"),
        "insurance": ("financialSummary.totalClientInsurance", "currency"),
        
        "totalassets": ("financialSummary.totalLifestyleAssets", "currency"),
        "total_assets": ("financialSummary.totalLifestyleAssets", "currency"),
    }
    
    def __init__(self):
        pass
    
    def auto_map_placeholders(
        self, 
        placeholders: List[str], 
        client_data: dict
    ) -> Dict[str, MappingEntry]:
        """
        Automatically map placeholders to client data fields.
        
        Args:
            placeholders: List of placeholder strings (e.g., ["<client_name>"])
            client_data: Client data dictionary
            
        Returns:
            Dictionary mapping placeholders to MappingEntry objects
        """
        mappings: Dict[str, MappingEntry] = {}
        
        for placeholder in placeholders:
            # Clean placeholder: remove < > and normalize
            clean = self._normalize_placeholder(placeholder)
            
            # Try exact match first
            if clean in self.FIELD_MAPPINGS:
                field_path, format_hint = self.FIELD_MAPPINGS[clean]
                # Verify the field exists in client data
                value = self.resolve_field_value(field_path, client_data)
                
                mappings[placeholder] = MappingEntry(
                    field=field_path,
                    type="field_reference",
                    isCustom=False,
                    confidence="high" if value is not None else "medium",
                    format=format_hint
                )
            else:
                # Try fuzzy matching
                best_match = self._fuzzy_match(clean)
                if best_match:
                    field_path, format_hint = self.FIELD_MAPPINGS[best_match]
                    value = self.resolve_field_value(field_path, client_data)
                    
                    mappings[placeholder] = MappingEntry(
                        field=field_path,
                        type="field_reference",
                        isCustom=False,
                        confidence="medium" if value is not None else "low",
                        format=format_hint
                    )
                else:
                    # No match found
                    mappings[placeholder] = MappingEntry(
                        field=None,
                        type="custom_value",
                        isCustom=True,
                        customValue=None,
                        confidence="none"
                    )
        
        logger.info(f"Auto-mapped {len(placeholders)} placeholders: "
                   f"{sum(1 for m in mappings.values() if m.confidence == 'high')} high, "
                   f"{sum(1 for m in mappings.values() if m.confidence == 'medium')} medium, "
                   f"{sum(1 for m in mappings.values() if m.confidence == 'low')} low, "
                   f"{sum(1 for m in mappings.values() if m.confidence == 'none')} none")
        
        return mappings
    
    def _normalize_placeholder(self, placeholder: str) -> str:
        """Normalize a placeholder for matching."""
        # Remove angle brackets and convert to lowercase
        clean = placeholder.strip("<>").lower()
        # Remove underscores and hyphens for comparison
        normalized = clean.replace("_", "").replace("-", "")
        return normalized
    
    def _fuzzy_match(self, normalized: str) -> Optional[str]:
        """
        Try to find a fuzzy match for a normalized placeholder.
        
        Args:
            normalized: Normalized placeholder string
            
        Returns:
            Best matching key from FIELD_MAPPINGS or None
        """
        # Simple substring matching
        for key in self.FIELD_MAPPINGS.keys():
            key_normalized = key.replace("_", "").replace("-", "")
            # Check if one contains the other
            if normalized in key_normalized or key_normalized in normalized:
                # Only accept if significant overlap
                if len(normalized) >= 3 and len(key_normalized) >= 3:
                    overlap = min(len(normalized), len(key_normalized))
                    if overlap >= 4:
                        return key
        
        return None
    
    def resolve_field_value(
        self, 
        field_path: str, 
        client_data: dict,
        format_hint: Optional[str] = None
    ) -> Any:
        """
        Resolve a field path to its value in the client data.
        
        Args:
            field_path: Dot-notation path (e.g., "clientInfo.client1.name")
            client_data: Client data dictionary
            format_hint: Optional format hint (e.g., "currency", "date")
            
        Returns:
            Resolved value or None if not found
        """
        if not field_path or not client_data:
            return None
        
        parts = field_path.split(".")
        current = client_data
        
        try:
            for part in parts:
                if isinstance(current, dict):
                    current = current.get(part)
                else:
                    return None
                
                if current is None:
                    return None
            
            # Format the value if needed
            if format_hint and current is not None:
                current = self._format_value(current, format_hint)
            
            return current
            
        except Exception as e:
            logger.warning(f"Failed to resolve field path '{field_path}': {str(e)}")
            return None
    
    def _format_value(self, value: Any, format_hint: str) -> str:
        """
        Format a value according to the format hint.
        
        Args:
            value: Value to format
            format_hint: Format type (e.g., "currency", "date")
            
        Returns:
            Formatted string
        """
        if value is None:
            return ""
        
        if format_hint == "currency":
            try:
                num_value = float(value)
                return f"${num_value:,.2f}"
            except (ValueError, TypeError):
                return str(value)
        
        elif format_hint == "date":
            # Handle various date formats
            if isinstance(value, datetime):
                return value.strftime("%d/%m/%Y")
            elif isinstance(value, str):
                # Try to parse and reformat
                try:
                    # Try YYYY/MM/DD format
                    if "/" in value:
                        parts = value.split("/")
                        if len(parts) == 3 and len(parts[0]) == 4:
                            return f"{parts[2]}/{parts[1]}/{parts[0]}"
                except Exception:
                    pass
                return value
            return str(value)
        
        return str(value)
    
    def resolve_all_mappings(
        self, 
        mappings: Dict[str, MappingEntry], 
        client_data: dict
    ) -> Dict[str, str]:
        """
        Resolve all mappings to their final string values.
        
        Args:
            mappings: Dictionary of placeholder to MappingEntry
            client_data: Client data dictionary
            
        Returns:
            Dictionary mapping placeholders to resolved string values
        """
        resolved: Dict[str, str] = {}
        
        for placeholder, entry in mappings.items():
            if entry.isCustom and entry.customValue is not None:
                resolved[placeholder] = entry.customValue
            elif entry.field:
                value = self.resolve_field_value(
                    entry.field, 
                    client_data,
                    entry.format
                )
                resolved[placeholder] = str(value) if value is not None else ""
            else:
                resolved[placeholder] = ""
        
        return resolved
    
    def get_available_fields(self) -> List[dict]:
        """
        Get a list of all available fields that can be mapped to.
        Used to populate dropdown options in the UI.
        
        Returns:
            List of field info dictionaries
        """
        fields = []
        seen_paths = set()
        
        for pattern, (field_path, format_hint) in self.FIELD_MAPPINGS.items():
            if field_path not in seen_paths:
                seen_paths.add(field_path)
                # Create a human-readable label from the field path
                parts = field_path.split(".")
                label = " > ".join(
                    p.replace("client1", "Client 1")
                     .replace("client2", "Client 2")
                     .replace("clientInfo", "Client Info")
                     .replace("financialSummary", "Financial Summary")
                     .replace("grossSalary", "Gross Salary")
                     .replace("superBalance", "Super Balance")
                     .replace("advisorName", "Advisor Name")
                     .replace("consultationDate", "Consultation Date")
                    for p in parts
                )
                
                fields.append({
                    "path": field_path,
                    "label": label,
                    "type": format_hint or "string"
                })
        
        # Sort by label
        fields.sort(key=lambda f: f["label"])
        
        return fields

