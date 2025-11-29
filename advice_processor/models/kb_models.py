from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class KBSearchRequest(BaseModel):
    """Request model for knowledge base search"""
    query: str = Field(..., description="Search query text")
    limit: int = Field(5, ge=1, le=20, description="Maximum number of results to return")


class KBSearchResult(BaseModel):
    """Single search result from knowledge base"""
    chunk_id: str
    document_id: str
    chunk_index: int
    text: str
    similarity: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class KBSearchResponse(BaseModel):
    """Response model for knowledge base search"""
    query: str
    results: List[KBSearchResult]
    count: int


