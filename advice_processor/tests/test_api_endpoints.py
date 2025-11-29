"""
Integration tests for Knowledge Base API endpoints.
Tests the complete flow from upload to document generation.
"""

import pytest
import tempfile
import os
from pathlib import Path
from docx import Document
import httpx

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the FastAPI app
from main import app


@pytest.fixture
def client():
    """Create a test client using httpx transport."""
    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    with httpx.Client(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def sample_docx():
    """Create a sample .docx file for upload testing."""
    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
        doc = Document()
        doc.add_paragraph("Dear <client_name>,")
        doc.add_paragraph("Date: <date>")
        doc.add_paragraph("Super Balance: <super_balance>")
        doc.add_paragraph("Advisor: <advisor_name>")
        doc.save(tmp.name)
        yield tmp.name
    os.unlink(tmp.name)


@pytest.fixture
def sample_docx_no_placeholders():
    """Create a .docx file without placeholders."""
    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
        doc = Document()
        doc.add_paragraph("This is a simple document.")
        doc.add_paragraph("No placeholders here.")
        doc.save(tmp.name)
        yield tmp.name
    os.unlink(tmp.name)


class TestHealthAndBasics:
    """Test basic API functionality."""
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestTemplateUpload:
    """Test template upload functionality."""
    
    def test_upload_template(self, client, sample_docx):
        """Test uploading a template."""
        with open(sample_docx, "rb") as f:
            files = {"file": ("test_template.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            response = client.post(
                "/knowledge-base/upload",
                files=files,
                data={"description": "Test template"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "document" in data
        assert data["document"]["display_name"] == "Test Template"
    
    def test_upload_non_docx_rejected(self, client):
        """Test that non-.docx files are rejected."""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp:
            tmp.write(b"This is a text file")
            tmp.flush()
            
            with open(tmp.name, "rb") as f:
                files = {"file": ("test.txt", f, "text/plain")}
                response = client.post(
                    "/knowledge-base/upload",
                    files=files
                )
            
            os.unlink(tmp.name)
        
        assert response.status_code == 400
        assert "docx" in response.json()["detail"].lower()


class TestTemplateList:
    """Test template listing functionality."""
    
    def test_list_templates(self, client):
        """Test listing templates."""
        response = client.get("/knowledge-base/documents")
        
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert isinstance(data["documents"], list)


class TestPlaceholderExtraction:
    """Test placeholder extraction functionality."""
    
    def test_extract_placeholders(self, client, sample_docx):
        """Test extracting placeholders from an uploaded template."""
        # First upload a template
        with open(sample_docx, "rb") as f:
            files = {"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            upload_response = client.post(
                "/knowledge-base/upload",
                files=files
            )
        
        template_id = upload_response.json()["document"]["document_id"]
        
        # Then extract placeholders
        response = client.post(f"/knowledge-base/templates/{template_id}/extract-placeholders")
        
        assert response.status_code == 200
        data = response.json()
        assert "placeholders" in data
        assert "signature" in data
        assert "<client_name>" in data["placeholders"]
        assert "<date>" in data["placeholders"]
    
    def test_extract_placeholders_not_found(self, client):
        """Test extraction from non-existent template."""
        response = client.post("/knowledge-base/templates/nonexistent123/extract-placeholders")
        assert response.status_code == 404


class TestAutoMapping:
    """Test auto-mapping functionality."""
    
    def test_auto_map_needs_client(self, client, sample_docx):
        """Test that auto-map requires a valid client."""
        # Upload template
        with open(sample_docx, "rb") as f:
            files = {"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            upload_response = client.post(
                "/knowledge-base/upload",
                files=files
            )
        
        template_id = upload_response.json()["document"]["document_id"]
        
        # Try to auto-map with non-existent client
        response = client.post(
            f"/knowledge-base/templates/{template_id}/auto-map",
            json={"client_id": "nonexistent"}
        )
        
        assert response.status_code == 404


class TestMappingCRUD:
    """Test mapping save/load/delete functionality."""
    
    def test_save_and_load_mapping(self, client, sample_docx):
        """Test saving and loading a mapping."""
        # Upload template
        with open(sample_docx, "rb") as f:
            files = {"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            upload_response = client.post(
                "/knowledge-base/upload",
                files=files
            )
        
        template_id = upload_response.json()["document"]["document_id"]
        
        # Save a mapping
        mapping_data = {
            "template_id": template_id,
            "template_name": "Test Template",
            "mappings": {
                "<client_name>": {
                    "field": "clientInfo.client1.name",
                    "type": "field_reference",
                    "isCustom": False,
                    "confidence": "high"
                }
            },
            "placeholder_signature": "abc123"
        }
        
        save_response = client.post(
            f"/knowledge-base/templates/{template_id}/mapping",
            json=mapping_data
        )
        
        assert save_response.status_code == 200
        
        # Load the mapping
        load_response = client.get(f"/knowledge-base/templates/{template_id}/mapping")
        
        assert load_response.status_code == 200
        data = load_response.json()
        assert "mappings" in data
        assert "<client_name>" in data["mappings"]
    
    def test_delete_mapping(self, client, sample_docx):
        """Test deleting a mapping."""
        # Upload template
        with open(sample_docx, "rb") as f:
            files = {"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            upload_response = client.post(
                "/knowledge-base/upload",
                files=files
            )
        
        template_id = upload_response.json()["document"]["document_id"]
        
        # Save a mapping first
        mapping_data = {
            "template_id": template_id,
            "template_name": "Test",
            "mappings": {},
            "placeholder_signature": "test"
        }
        client.post(f"/knowledge-base/templates/{template_id}/mapping", json=mapping_data)
        
        # Delete the mapping
        delete_response = client.delete(f"/knowledge-base/templates/{template_id}/mapping")
        
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        load_response = client.get(f"/knowledge-base/templates/{template_id}/mapping")
        assert load_response.status_code == 404
    
    def test_load_nonexistent_mapping(self, client, sample_docx):
        """Test loading a mapping that doesn't exist."""
        # Upload template without saving a mapping
        with open(sample_docx, "rb") as f:
            files = {"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            upload_response = client.post(
                "/knowledge-base/upload",
                files=files
            )
        
        template_id = upload_response.json()["document"]["document_id"]
        
        response = client.get(f"/knowledge-base/templates/{template_id}/mapping")
        assert response.status_code == 404


class TestMappingValidation:
    """Test mapping validation functionality."""
    
    def test_validate_mapping_no_mapping(self, client, sample_docx):
        """Test validation when no mapping exists."""
        # Upload template
        with open(sample_docx, "rb") as f:
            files = {"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            upload_response = client.post(
                "/knowledge-base/upload",
                files=files
            )
        
        template_id = upload_response.json()["document"]["document_id"]
        
        response = client.post(
            f"/knowledge-base/templates/{template_id}/validate-mapping",
            json={"placeholders": ["<client_name>"]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        assert data["reason"] == "no_mapping"


class TestAvailableFields:
    """Test available fields endpoint."""
    
    def test_get_available_fields(self, client, sample_docx):
        """Test getting available fields."""
        # Upload template
        with open(sample_docx, "rb") as f:
            files = {"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            upload_response = client.post(
                "/knowledge-base/upload",
                files=files
            )
        
        template_id = upload_response.json()["document"]["document_id"]
        
        response = client.get(f"/knowledge-base/templates/{template_id}/available-fields")
        
        assert response.status_code == 200
        data = response.json()
        assert "fields" in data
        assert isinstance(data["fields"], list)
        assert len(data["fields"]) > 0


class TestTemplateDelete:
    """Test template deletion."""
    
    def test_delete_template(self, client, sample_docx):
        """Test deleting a template."""
        # Upload template
        with open(sample_docx, "rb") as f:
            files = {"file": ("test.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            upload_response = client.post(
                "/knowledge-base/upload",
                files=files
            )
        
        template_id = upload_response.json()["document"]["document_id"]
        
        # Delete it
        delete_response = client.delete(f"/knowledge-base/templates/{template_id}")
        
        assert delete_response.status_code == 200
        
        # Verify it's gone
        extract_response = client.post(f"/knowledge-base/templates/{template_id}/extract-placeholders")
        assert extract_response.status_code == 404
    
    def test_delete_nonexistent_template(self, client):
        """Test deleting a non-existent template."""
        response = client.delete("/knowledge-base/templates/nonexistent123")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
