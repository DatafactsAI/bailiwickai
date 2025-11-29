"""
Data models for template completion feature.
Defines structures for template mappings, placeholder entries, and validation results.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Literal
from datetime import datetime


class MappingEntry(BaseModel):
    """
    Represents a single placeholder-to-field mapping.
    Can be either a field reference or a custom value.
    """
    field: Optional[str] = None  # Field path (e.g., "clientInfo.client1.name") or null
    type: Literal["field_reference", "custom_value"] = "field_reference"
    isCustom: bool = False
    customValue: Optional[str] = None
    confidence: Optional[Literal["high", "medium", "low", "none"]] = None
    format: Optional[str] = None  # Optional formatting hint (e.g., "currency", "date")


class TemplateMapping(BaseModel):
    """
    Complete mapping configuration for a template.
    Saved per-template for reuse across document generations.
    """
    template_id: str
    template_name: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    mappings: Dict[str, MappingEntry]
    placeholder_signature: str  # MD5 hash of placeholders for change detection


class TemplateProfile(BaseModel):
    """
    Metadata about an uploaded template document.
    Returned when listing available templates.
    """
    document_id: str
    display_name: str
    source_filename: str
    file_extension: str = "docx"
    file_size: int  # bytes
    word_count: int = 0
    page_count: Optional[int] = None
    uploaded_at: datetime = Field(default_factory=datetime.now)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    client_ids: Optional[List[str]] = None
    has_mapping: bool = False


class ExtractPlaceholdersResponse(BaseModel):
    """Response from placeholder extraction endpoint."""
    placeholders: List[str]
    signature: str


class AutoMapRequest(BaseModel):
    """Request body for auto-mapping placeholders."""
    client_id: str


class AutoMapResponse(BaseModel):
    """Response from auto-mapping endpoint."""
    mappings: Dict[str, MappingEntry]
    placeholders: List[str]


class ValidateMappingRequest(BaseModel):
    """Request body for validating a saved mapping."""
    placeholders: List[str]


class ValidateMappingResponse(BaseModel):
    """Response from mapping validation endpoint."""
    valid: bool
    reason: Optional[str] = None
    saved_mapping: Optional[TemplateMapping] = None
    missing_placeholders: Optional[List[str]] = None
    extra_placeholders: Optional[List[str]] = None


class GenerateDocumentRequest(BaseModel):
    """Request body for document generation."""
    client_id: str
    mappings: Dict[str, MappingEntry]
    save_mapping: bool = True


class GenerateDocumentResponse(BaseModel):
    """Response from document generation endpoint."""
    status: str
    download_url: str
    file_path: str
    generated_at: datetime = Field(default_factory=datetime.now)


class UploadTemplateResponse(BaseModel):
    """Response from template upload endpoint."""
    status: str
    document: TemplateProfile


