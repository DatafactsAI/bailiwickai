"""
Unit tests for MappingEngine class.
Tests auto-mapping, field resolution, and value formatting.
"""

import pytest
from pathlib import Path

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from document_engine.mapping_engine import MappingEngine


@pytest.fixture
def engine():
    """Create a MappingEngine instance."""
    return MappingEngine()


@pytest.fixture
def sample_client_data():
    """Create sample client data for testing."""
    return {
        "id": "001",
        "clientInfo": {
            "client1": {
                "name": "John Smith",
                "dob": "1980/05/15",
                "grossSalary": 95000,
                "superBalance": 320000,
                "health": "Good",
                "workStatus": "Full-time",
                "incomeTax": 22000,
                "centrelinkReceived": 0
            },
            "client2": {
                "name": "Jane Smith",
                "dob": "1982/08/22",
                "grossSalary": 78000,
                "superBalance": 245000,
                "health": "Excellent",
                "workStatus": "Part-time"
            },
            "consultationDate": "2025/01/15",
            "advisorName": "Andrea Paynter"
        },
        "financialSummary": {
            "totalLifestyleAssets": 650000,
            "totalLivingExpenses": 85000,
            "totalInvestmentAssets": 180000,
            "totalSuperannuationAssets": 565000,
            "totalClientLoans": 350000,
            "totalClientInsurance": 15000
        }
    }


class TestAutoMapping:
    """Tests for auto-mapping functionality."""
    
    def test_auto_map_client_name(self, engine, sample_client_data):
        """Test auto-mapping of client name placeholder."""
        placeholders = ["<client_name>"]
        mappings = engine.auto_map_placeholders(placeholders, sample_client_data)
        
        assert "<client_name>" in mappings
        assert mappings["<client_name>"].field == "clientInfo.client1.name"
        assert mappings["<client_name>"].confidence in ["high", "medium"]
    
    def test_auto_map_date(self, engine, sample_client_data):
        """Test auto-mapping of date placeholder."""
        placeholders = ["<date>"]
        mappings = engine.auto_map_placeholders(placeholders, sample_client_data)
        
        assert "<date>" in mappings
        assert mappings["<date>"].field == "clientInfo.consultationDate"
    
    def test_auto_map_advisor(self, engine, sample_client_data):
        """Test auto-mapping of advisor name placeholder."""
        placeholders = ["<advisor_name>"]
        mappings = engine.auto_map_placeholders(placeholders, sample_client_data)
        
        assert "<advisor_name>" in mappings
        assert mappings["<advisor_name>"].field == "clientInfo.advisorName"
    
    def test_auto_map_super_balance(self, engine, sample_client_data):
        """Test auto-mapping of super balance placeholder."""
        placeholders = ["<super_balance>"]
        mappings = engine.auto_map_placeholders(placeholders, sample_client_data)
        
        assert "<super_balance>" in mappings
        assert mappings["<super_balance>"].field == "clientInfo.client1.superBalance"
        assert mappings["<super_balance>"].format == "currency"
    
    def test_auto_map_unknown_placeholder(self, engine, sample_client_data):
        """Test auto-mapping of unknown placeholder."""
        placeholders = ["<unknown_field_xyz>"]
        mappings = engine.auto_map_placeholders(placeholders, sample_client_data)
        
        assert "<unknown_field_xyz>" in mappings
        assert mappings["<unknown_field_xyz>"].field is None
        assert mappings["<unknown_field_xyz>"].confidence == "none"
        assert mappings["<unknown_field_xyz>"].isCustom is True
    
    def test_auto_map_multiple_placeholders(self, engine, sample_client_data):
        """Test auto-mapping of multiple placeholders."""
        placeholders = ["<client_name>", "<date>", "<super_balance>", "<unknown>"]
        mappings = engine.auto_map_placeholders(placeholders, sample_client_data)
        
        assert len(mappings) == 4
        
        # Known fields should be mapped
        assert mappings["<client_name>"].field is not None
        assert mappings["<date>"].field is not None
        assert mappings["<super_balance>"].field is not None
        
        # Unknown field should not be mapped
        assert mappings["<unknown>"].field is None
    
    def test_auto_map_case_insensitive(self, engine, sample_client_data):
        """Test that auto-mapping is case-insensitive."""
        placeholders = ["<CLIENT_NAME>", "<Date>", "<SUPER_BALANCE>"]
        mappings = engine.auto_map_placeholders(placeholders, sample_client_data)
        
        # All should be mapped despite different cases
        for p in placeholders:
            assert mappings[p].field is not None
    
    def test_auto_map_client2_fields(self, engine, sample_client_data):
        """Test auto-mapping of Client 2 specific fields."""
        placeholders = ["<client2_name>", "<client2_super_balance>"]
        mappings = engine.auto_map_placeholders(placeholders, sample_client_data)
        
        assert mappings["<client2_name>"].field == "clientInfo.client2.name"
        assert mappings["<client2_super_balance>"].field == "clientInfo.client2.superBalance"


class TestFieldResolution:
    """Tests for field value resolution."""
    
    def test_resolve_simple_path(self, engine, sample_client_data):
        """Test resolving a simple field path."""
        value = engine.resolve_field_value("clientInfo.client1.name", sample_client_data)
        assert value == "John Smith"
    
    def test_resolve_nested_path(self, engine, sample_client_data):
        """Test resolving a deeply nested field path."""
        value = engine.resolve_field_value("clientInfo.client1.superBalance", sample_client_data)
        assert value == 320000
    
    def test_resolve_missing_field(self, engine, sample_client_data):
        """Test resolving a non-existent field path."""
        value = engine.resolve_field_value("clientInfo.client1.nonexistent", sample_client_data)
        assert value is None
    
    def test_resolve_empty_path(self, engine, sample_client_data):
        """Test resolving an empty path."""
        value = engine.resolve_field_value("", sample_client_data)
        assert value is None
    
    def test_resolve_with_currency_format(self, engine, sample_client_data):
        """Test resolving with currency formatting."""
        value = engine.resolve_field_value(
            "clientInfo.client1.superBalance", 
            sample_client_data,
            format_hint="currency"
        )
        assert value == "$320,000.00"
    
    def test_resolve_with_date_format(self, engine, sample_client_data):
        """Test resolving with date formatting."""
        value = engine.resolve_field_value(
            "clientInfo.consultationDate", 
            sample_client_data,
            format_hint="date"
        )
        # Should convert from YYYY/MM/DD to DD/MM/YYYY
        assert "15" in value
        assert "01" in value
        assert "2025" in value


class TestResolveAllMappings:
    """Tests for resolving all mappings to final values."""
    
    def test_resolve_all_field_references(self, engine, sample_client_data):
        """Test resolving mappings with field references."""
        from models.template_models import MappingEntry
        
        mappings = {
            "<name>": MappingEntry(
                field="clientInfo.client1.name",
                type="field_reference",
                isCustom=False
            ),
            "<date>": MappingEntry(
                field="clientInfo.consultationDate",
                type="field_reference",
                isCustom=False
            )
        }
        
        resolved = engine.resolve_all_mappings(mappings, sample_client_data)
        
        assert resolved["<name>"] == "John Smith"
        assert "2025" in resolved["<date>"]
    
    def test_resolve_all_custom_values(self, engine, sample_client_data):
        """Test resolving mappings with custom values."""
        from models.template_models import MappingEntry
        
        mappings = {
            "<greeting>": MappingEntry(
                field=None,
                type="custom_value",
                isCustom=True,
                customValue="Dear Valued Client"
            )
        }
        
        resolved = engine.resolve_all_mappings(mappings, sample_client_data)
        
        assert resolved["<greeting>"] == "Dear Valued Client"
    
    def test_resolve_all_mixed(self, engine, sample_client_data):
        """Test resolving mixed field references and custom values."""
        from models.template_models import MappingEntry
        
        mappings = {
            "<name>": MappingEntry(
                field="clientInfo.client1.name",
                type="field_reference",
                isCustom=False
            ),
            "<custom>": MappingEntry(
                field=None,
                type="custom_value",
                isCustom=True,
                customValue="Custom Text"
            )
        }
        
        resolved = engine.resolve_all_mappings(mappings, sample_client_data)
        
        assert resolved["<name>"] == "John Smith"
        assert resolved["<custom>"] == "Custom Text"


class TestAvailableFields:
    """Tests for available fields listing."""
    
    def test_get_available_fields(self, engine):
        """Test getting list of available fields."""
        fields = engine.get_available_fields()
        
        assert isinstance(fields, list)
        assert len(fields) > 0
        
        # Each field should have path, label, and type
        for field in fields:
            assert "path" in field
            assert "label" in field
            assert "type" in field
    
    def test_available_fields_unique_paths(self, engine):
        """Test that available fields have unique paths."""
        fields = engine.get_available_fields()
        paths = [f["path"] for f in fields]
        
        assert len(paths) == len(set(paths))
    
    def test_available_fields_sorted(self, engine):
        """Test that available fields are sorted by label."""
        fields = engine.get_available_fields()
        labels = [f["label"] for f in fields]
        
        assert labels == sorted(labels)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


