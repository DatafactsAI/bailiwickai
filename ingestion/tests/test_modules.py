import pytest
from unittest.mock import Mock, patch
from ingestion.pdf_parser import PDFParser
from ingestion.data_processor import DataProcessor
from ingestion.webhook_client import WebhookClient
from ingestion.models import WebhookPayload

# --- PDF Parser Tests ---
def test_pdf_extraction_mock(tmp_path):
    """Test basic file handling, mocking fitz since we don't have a real PDF in CI environment yet."""
    # Note: In a real run we'd use the fixture, but here we mock for unit safety
    with patch('ingestion.pdf_parser.fitz.open') as mock_open:
        mock_doc = Mock()
        mock_page = Mock()
        mock_page.get_text.return_value = "Test PDF Content"
        mock_doc.__iter__ = Mock(return_value=iter([mock_page]))
        # Fix: mock __len__ magic method properly
        mock_doc.__len__ = Mock(return_value=1)
        mock_open.return_value = mock_doc
        
        parser = PDFParser("dummy.pdf")
        text = parser.extract_text()
        assert text == "Test PDF Content"

# --- Data Processor Tests ---
def test_clean_number():
    dp = DataProcessor()
    assert dp.clean_number("1,234.56") == 1234.56
    assert dp.clean_number("$500") == 500.0
    assert dp.clean_number("") == 0.0
    assert dp.clean_number(None) == 0.0

def test_format_date():
    dp = DataProcessor()
    assert dp.format_date("2023-01-01") == "2023/01/01"
    assert dp.format_date("01/01/2023") == "2023/01/01"
    # US style ambiguous, usually assumes local, but python default is often Y-M-D or D-M-Y depending on libs
    # standard lib strptime follows format strictly
    assert dp.format_date("1 Jan 2023") == "2023/01/01" 

def test_process_lifestyle_assets():
    dp = DataProcessor()
    input_json = '[{"description": "Car", "value": "20,000"}, {"description": "Boat", "value": 10000}]'
    result = dp.process_lifestyle_assets(input_json)
    
    assert result['total_lifestyle_assets'] == 2
    assert result['lifestyle_asset_value_1'] == "20000.0"
    assert result['lifestyle_asset_value_2'] == "10000.0"
    assert result['lifestyle_assets_total_value'] == "30000.0"

# --- Webhook Client Tests ---
@patch('ingestion.webhook_client.requests.post')
def test_webhook_send_success(mock_post):
    mock_post.return_value.status_code = 200
    
    client = WebhookClient()
    payload = WebhookPayload(client1_name="Test") # Minimal valid payload
    
    assert client.send_data(payload) is True
    mock_post.assert_called_once()

@patch('ingestion.webhook_client.requests.post')
def test_webhook_send_failure(mock_post):
    mock_post.return_value.status_code = 500
    
    client = WebhookClient()
    payload = WebhookPayload()
    
    # Should retry 3 times then fail
    assert client.send_data(payload) is False
    assert mock_post.call_count == 3

