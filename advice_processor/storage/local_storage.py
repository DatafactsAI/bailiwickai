import json
import os
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from models.data_models import ClientData, AnalysisResult

logger = logging.getLogger(__name__)


class LocalStorage:
    """Manages local JSON file storage for client data, analysis results, and templates"""
    
    def __init__(self, data_dir: str = "../data"):
        self.data_dir = Path(data_dir)
        self.clients_dir = self.data_dir / "clients"
        self.analysis_dir = self.data_dir / "analysis"
        
        # Template directories
        self.templates_dir = self.data_dir / "templates"
        self.template_files_dir = self.templates_dir / "files"
        self.template_profiles_dir = self.templates_dir / "profiles"
        self.template_generated_dir = self.templates_dir / "generated"
        
        # Knowledge base directories
        self.kb_dir = self.data_dir / "knowledge_base"
        self.kb_files_dir = self.kb_dir / "files"
        self.kb_text_dir = self.kb_dir / "text"
        self.kb_embeddings_dir = self.kb_dir / "embeddings"
        self.kb_profiles_dir = self.kb_dir / "profiles"
        
        # Ensure all directories exist
        self.clients_dir.mkdir(parents=True, exist_ok=True)
        self.analysis_dir.mkdir(parents=True, exist_ok=True)
        self.template_files_dir.mkdir(parents=True, exist_ok=True)
        self.template_profiles_dir.mkdir(parents=True, exist_ok=True)
        self.template_generated_dir.mkdir(parents=True, exist_ok=True)
        self.kb_files_dir.mkdir(parents=True, exist_ok=True)
        self.kb_text_dir.mkdir(parents=True, exist_ok=True)
        self.kb_embeddings_dir.mkdir(parents=True, exist_ok=True)
        self.kb_profiles_dir.mkdir(parents=True, exist_ok=True)
    
    def save_client(self, client_data: ClientData) -> None:
        """Save client data to JSON file"""
        file_path = self.clients_dir / f"client_{client_data.id}.json"
        with open(file_path, 'w') as f:
            json.dump(client_data.model_dump(), f, indent=2, default=str)
    
    def load_client(self, client_id: str) -> Optional[ClientData]:
        """Load client data from JSON file"""
        file_path = self.clients_dir / f"client_{client_id}.json"
        if not file_path.exists():
            return None
        
        with open(file_path, 'r') as f:
            data = json.load(f)
            return ClientData(**data)
    
    def save_analysis(self, analysis: AnalysisResult) -> None:
        """Save analysis result to JSON file"""
        file_path = self.analysis_dir / f"client_{analysis.clientId}_analysis.json"
        with open(file_path, 'w') as f:
            json.dump(analysis.model_dump(), f, indent=2, default=str)
    
    def load_analysis(self, client_id: str) -> Optional[AnalysisResult]:
        """Load analysis result from JSON file"""
        file_path = self.analysis_dir / f"client_{client_id}_analysis.json"
        if not file_path.exists():
            return None
        
        with open(file_path, 'r') as f:
            data = json.load(f)
            return AnalysisResult(**data)
    
    def list_clients(self) -> list[str]:
        """List all client IDs"""
        client_files = self.clients_dir.glob("client_*.json")
        return [f.stem.replace("client_", "", 1) for f in client_files]
    
    def client_exists(self, client_id: str) -> bool:
        """Check if client data exists"""
        file_path = self.clients_dir / f"client_{client_id}.json"
        return file_path.exists()
    
    def analysis_exists(self, client_id: str) -> bool:
        """Check if analysis exists"""
        file_path = self.analysis_dir / f"client_{client_id}_analysis.json"
        return file_path.exists()
    
    # ========== Template Management Methods ==========
    
    def save_template_file(
        self, 
        template_id: str, 
        file_content: bytes, 
        filename: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Path:
        """
        Save an uploaded template file and its metadata.
        
        Args:
            template_id: Unique identifier for the template
            file_content: Raw bytes of the .docx file
            filename: Original filename
            metadata: Optional metadata dictionary
            
        Returns:
            Path to the saved file
        """
        # Save the template file
        file_path = self.template_files_dir / f"{template_id}.docx"
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Save metadata as JSON
        meta = metadata or {}
        meta.update({
            "template_id": template_id,
            "source_filename": filename,
            "file_size": len(file_content),
            "uploaded_at": datetime.now().isoformat()
        })
        
        meta_path = self.template_files_dir / f"{template_id}_meta.json"
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        
        logger.info(f"Saved template file: {template_id} ({filename})")
        return file_path
    
    def load_template_file(self, template_id: str) -> Optional[Path]:
        """
        Get the path to a template file.
        
        Args:
            template_id: Template identifier
            
        Returns:
            Path to the template file or None if not found
        """
        file_path = self.template_files_dir / f"{template_id}.docx"
        if file_path.exists():
            return file_path
        return None
    
    def load_template_metadata(self, template_id: str) -> Optional[Dict[str, Any]]:
        """
        Load template metadata.
        
        Args:
            template_id: Template identifier
            
        Returns:
            Metadata dictionary or None if not found
        """
        meta_path = self.template_files_dir / f"{template_id}_meta.json"
        if not meta_path.exists():
            return None
        
        with open(meta_path, 'r') as f:
            return json.load(f)
    
    def update_template_metadata(self, template_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update template metadata with new values.
        
        Args:
            template_id: Template identifier
            updates: Dictionary of updates to apply
            
        Returns:
            True if successful, False if template not found
        """
        meta = self.load_template_metadata(template_id)
        if meta is None:
            return False
        
        meta.update(updates)
        meta_path = self.template_files_dir / f"{template_id}_meta.json"
        
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        
        return True
    
    def template_exists(self, template_id: str) -> bool:
        """Check if a template file exists."""
        file_path = self.template_files_dir / f"{template_id}.docx"
        return file_path.exists()
    
    def list_templates(self) -> List[Dict[str, Any]]:
        """
        List all available templates with their metadata.
        
        Returns:
            List of template metadata dictionaries
        """
        templates = []
        
        # Find all .docx files in template_files_dir
        for docx_file in self.template_files_dir.glob("*.docx"):
            template_id = docx_file.stem
            
            # Load metadata
            meta = self.load_template_metadata(template_id)
            if meta:
                # Check if mapping exists
                meta["has_mapping"] = self.template_mapping_exists(template_id)
                templates.append(meta)
            else:
                # Create basic metadata from file
                templates.append({
                    "template_id": template_id,
                    "source_filename": docx_file.name,
                    "file_size": docx_file.stat().st_size,
                    "uploaded_at": datetime.fromtimestamp(
                        docx_file.stat().st_mtime
                    ).isoformat(),
                    "has_mapping": self.template_mapping_exists(template_id)
                })
        
        # Sort by upload date (newest first)
        templates.sort(key=lambda t: t.get("uploaded_at", ""), reverse=True)
        
        return templates
    
    def delete_template(self, template_id: str) -> bool:
        """
        Delete a template and all associated files.
        
        Args:
            template_id: Template identifier
            
        Returns:
            True if deleted, False if not found
        """
        deleted = False
        
        # Delete template file
        file_path = self.template_files_dir / f"{template_id}.docx"
        if file_path.exists():
            file_path.unlink()
            deleted = True
        
        # Delete metadata
        meta_path = self.template_files_dir / f"{template_id}_meta.json"
        if meta_path.exists():
            meta_path.unlink()
        
        # Delete mapping if exists
        mapping_path = self.template_profiles_dir / f"{template_id}_mapping.json"
        if mapping_path.exists():
            mapping_path.unlink()
        
        if deleted:
            logger.info(f"Deleted template: {template_id}")
        
        return deleted
    
    # ========== Mapping Management Methods ==========
    
    def save_template_mapping(self, template_id: str, mapping_config: Dict[str, Any]) -> None:
        """
        Save a template mapping configuration.
        
        Args:
            template_id: Template identifier
            mapping_config: Mapping configuration dictionary
        """
        file_path = self.template_profiles_dir / f"{template_id}_mapping.json"
        
        # Ensure updated_at is set
        mapping_config["updated_at"] = datetime.now().isoformat()
        if "created_at" not in mapping_config:
            mapping_config["created_at"] = datetime.now().isoformat()
        
        with open(file_path, 'w') as f:
            json.dump(mapping_config, f, indent=2)
        
        logger.info(f"Saved mapping for template: {template_id}")
    
    def load_template_mapping(self, template_id: str) -> Optional[Dict[str, Any]]:
        """
        Load a saved template mapping configuration.
        
        Args:
            template_id: Template identifier
            
        Returns:
            Mapping configuration dictionary or None if not found
        """
        file_path = self.template_profiles_dir / f"{template_id}_mapping.json"
        if not file_path.exists():
            return None
        
        with open(file_path, 'r') as f:
            return json.load(f)
    
    def template_mapping_exists(self, template_id: str) -> bool:
        """Check if a mapping exists for a template."""
        file_path = self.template_profiles_dir / f"{template_id}_mapping.json"
        return file_path.exists()
    
    def delete_template_mapping(self, template_id: str) -> bool:
        """
        Delete a template mapping.
        
        Args:
            template_id: Template identifier
            
        Returns:
            True if deleted, False if not found
        """
        file_path = self.template_profiles_dir / f"{template_id}_mapping.json"
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted mapping for template: {template_id}")
            return True
        return False
    
    # ========== Generated Document Methods ==========
    
    def save_generated_document(
        self, 
        template_id: str, 
        client_id: str, 
        document_bytes: bytes
    ) -> Path:
        """
        Save a generated document.
        
        Args:
            template_id: Template identifier
            client_id: Client identifier
            document_bytes: Generated document as bytes
            
        Returns:
            Path to the saved document
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{template_id}_{client_id}_{timestamp}.docx"
        file_path = self.template_generated_dir / filename
        
        with open(file_path, 'wb') as f:
            f.write(document_bytes)
        
        logger.info(f"Saved generated document: {filename}")
        return file_path
    
    def load_generated_document(self, filename: str) -> Optional[bytes]:
        """
        Load a generated document.
        
        Args:
            filename: Name of the generated document file
            
        Returns:
            Document bytes or None if not found
        """
        file_path = self.template_generated_dir / filename
        if not file_path.exists():
            return None
        
        with open(file_path, 'rb') as f:
            return f.read()
    
    def list_generated_documents(
        self, 
        template_id: Optional[str] = None, 
        client_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List generated documents, optionally filtered.
        
        Args:
            template_id: Optional filter by template
            client_id: Optional filter by client
            
        Returns:
            List of document info dictionaries
        """
        documents = []
        
        for doc_file in self.template_generated_dir.glob("*.docx"):
            parts = doc_file.stem.split("_")
            if len(parts) >= 3:
                doc_template_id = parts[0]
                doc_client_id = parts[1]
                
                # Apply filters
                if template_id and doc_template_id != template_id:
                    continue
                if client_id and doc_client_id != client_id:
                    continue
                
                documents.append({
                    "filename": doc_file.name,
                    "template_id": doc_template_id,
                    "client_id": doc_client_id,
                    "file_size": doc_file.stat().st_size,
                    "generated_at": datetime.fromtimestamp(
                        doc_file.stat().st_mtime
                    ).isoformat()
                })
        
        # Sort by generation date (newest first)
        documents.sort(key=lambda d: d.get("generated_at", ""), reverse=True)
        
        return documents
    
    # ========== Knowledge Base Management Methods ==========
    
    def save_kb_document(
        self,
        document_id: str,
        file_content: bytes,
        filename: str,
        text_content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Path]:
        """
        Save a knowledge base document file and extracted text.
        
        Args:
            document_id: Unique document identifier
            file_content: Raw bytes of the document file
            filename: Original filename
            text_content: Extracted text content
            metadata: Optional metadata dictionary
            
        Returns:
            Dictionary with paths to saved files
        """
        # Determine file extension
        ext = Path(filename).suffix.lower()
        
        # Save original file
        file_path = self.kb_files_dir / f"{document_id}{ext}"
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Save extracted text
        text_path = self.kb_text_dir / f"{document_id}.txt"
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(text_content)
        
        # Save metadata
        meta = metadata or {}
        meta.update({
            "document_id": document_id,
            "source_filename": filename,
            "file_size": len(file_content),
            "text_length": len(text_content),
            "uploaded_at": datetime.now().isoformat()
        })
        
        meta_path = self.kb_profiles_dir / f"{document_id}_meta.json"
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        
        logger.info(f"Saved KB document: {document_id} ({filename})")
        
        return {
            "file_path": file_path,
            "text_path": text_path,
            "meta_path": meta_path
        }
    
    def load_kb_text(self, document_id: str) -> Optional[str]:
        """
        Load extracted text for a knowledge base document.
        
        Args:
            document_id: Document identifier
            
        Returns:
            Text content or None if not found
        """
        text_path = self.kb_text_dir / f"{document_id}.txt"
        if not text_path.exists():
            return None
        
        with open(text_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def list_kb_documents(self) -> List[Dict[str, Any]]:
        """
        List all knowledge base documents.
        
        Returns:
            List of document metadata dictionaries
        """
        documents = []
        
        # Find all metadata files
        for meta_file in self.kb_profiles_dir.glob("*_meta.json"):
            try:
                with open(meta_file, 'r') as f:
                    meta = json.load(f)
                    documents.append(meta)
            except Exception as e:
                logger.warning(f"Failed to load metadata from {meta_file}: {str(e)}")
                continue
        
        # Sort by upload date (newest first)
        documents.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)
        
        return documents
    
    def kb_document_exists(self, document_id: str) -> bool:
        """Check if a knowledge base document exists."""
        meta_path = self.kb_profiles_dir / f"{document_id}_meta.json"
        return meta_path.exists()
    
    def delete_kb_document(self, document_id: str) -> bool:
        """
        Delete a knowledge base document and all associated files.
        
        Args:
            document_id: Document identifier
            
        Returns:
            True if deleted, False if not found
        """
        deleted = False
        
        # Delete metadata
        meta_path = self.kb_profiles_dir / f"{document_id}_meta.json"
        if meta_path.exists():
            meta_path.unlink()
            deleted = True
        
        # Delete original file (find by extension)
        for file_path in self.kb_files_dir.glob(f"{document_id}.*"):
            if file_path.suffix != ".txt":  # Don't delete text files here
                file_path.unlink()
        
        # Delete text file
        text_path = self.kb_text_dir / f"{document_id}.txt"
        if text_path.exists():
            text_path.unlink()
        
        # Delete embeddings
        embeddings_path = self.kb_embeddings_dir / f"{document_id}_embeddings.json"
        if embeddings_path.exists():
            embeddings_path.unlink()
        
        if deleted:
            logger.info(f"Deleted KB document: {document_id}")
        
        return deleted



