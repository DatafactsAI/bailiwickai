from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from datetime import datetime
import logging
import tempfile
import os
import uuid
import json
from pathlib import Path
from typing import Optional, List

from models.data_models import ClientData, AnalysisResult, ProcessedAsset
from models.template_models import (
    TemplateProfile, TemplateMapping, MappingEntry,
    ExtractPlaceholdersResponse, AutoMapRequest, AutoMapResponse,
    ValidateMappingRequest, ValidateMappingResponse,
    GenerateDocumentRequest, GenerateDocumentResponse,
    UploadTemplateResponse
)
from models.kb_models import KBSearchRequest, KBSearchResponse, KBSearchResult
from processors.ai_processor import AIProcessor
from processors.embedding_service import EmbeddingService
from storage.local_storage import LocalStorage
from config.settings import settings
from document_engine.placeholder_extractor import PlaceholderExtractor
from document_engine.mapping_engine import MappingEngine
from document_engine.document_generator import DocumentGenerator

# Configure logging
logging.basicConfig(
    level=settings.log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Financial Advice Processor",
    description="AI-powered financial advice analysis service",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8081",
    ],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
storage = LocalStorage(data_dir=settings.data_dir)
ai_processor = AIProcessor(api_key=settings.openai_api_key, model=settings.openai_model)
embedding_service = EmbeddingService(api_key=settings.openai_api_key)

# Initialize document engine components
placeholder_extractor = PlaceholderExtractor()
mapping_engine = MappingEngine()
document_generator = DocumentGenerator()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "openai": "connected",
            "storage": "ready"
        }
    }

@app.get("/clients")
async def list_clients():
    """List all available clients"""
    client_ids = storage.list_clients()
    clients = []
    for client_id in client_ids:
        client = storage.load_client(client_id)
        if client:
            clients.append({
                "id": client.id,
                "client1_name": client.clientInfo.client1.name,
                "client2_name": client.clientInfo.client2.name if client.clientInfo.client2 else None,
                "consultation_date": client.clientInfo.consultationDate
            })
    return {"clients": clients}

@app.get("/clients/{client_id}")
async def get_client(client_id: str):
    """Get client data by ID"""
    client = storage.load_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.post("/clients")
async def create_client(client_data: ClientData):
    """Create or update client data"""
    try:
        storage.save_client(client_data)
        logger.info(f"Saved client data for {client_data.id}")
        return {"status": "success", "client_id": client_data.id}
    except Exception as e:
        logger.error(f"Failed to save client: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/{client_id}")
async def analyze_client(client_id: str):
    """
    Run AI analysis on client data and store results locally.
    This is the main endpoint that processes client data through all AI steps.
    """
    start_time = datetime.now()
    
    try:
        # Load client data
        logger.info(f"Starting analysis for client {client_id}")
        client_data = storage.load_client(client_id)
        if not client_data:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Step 1: Restructure data
        logger.info("Step 1: Restructuring data...")
        restructured_data = ai_processor.step1_restructure_data(client_data)
        
        # Step 2: Extract client names
        logger.info("Step 2: Extracting client names...")
        client_names = ai_processor.step2_extract_client_names(client_data)
        
        # Step 3: Analyze retirement
        logger.info("Step 3: Analyzing retirement goals...")
        retirement_analysis = ai_processor.step3_analyze_retirement(restructured_data)
        
        # Step 4: Analyze cashflow
        logger.info("Step 4: Analyzing cashflow...")
        cashflow_analysis = ai_processor.step4_analyze_cashflow(restructured_data)
        
        # Step 5: Analyze debt
        logger.info("Step 5: Analyzing debt...")
        debt_analysis = ai_processor.step5_analyze_debt(restructured_data)
        
        # Step 6: Identify coverage gaps
        logger.info("Step 6: Identifying coverage gaps...")
        coverage_gaps = ai_processor.step6_identify_coverage_gaps(restructured_data)
        
        # Step 7: Extract strategies
        logger.info("Step 7: Extracting strategies...")
        strategies = ai_processor.step7_extract_strategies(restructured_data)
        
        # Step 8: Extract objectives
        logger.info("Step 8: Extracting objectives...")
        objectives = ai_processor.step8_extract_objectives(restructured_data)
        
        # Step 9: Extract recommendations
        logger.info("Step 9: Extracting recommendations...")
        client1_recs, client2_recs = ai_processor.step9_extract_recommendations(restructured_data)
        
        # Step 10: Analyze risk profile
        logger.info("Step 10: Analyzing risk profile...")
        risk_profile = ai_processor.step10_analyze_risk_profile(restructured_data)
        
        # Step 11: Process assets (Python logic)
        logger.info("Step 11: Processing assets...")
        processed_lifestyle = process_lifestyle_assets(client_data)
        processed_inv_c1, processed_inv_c2 = process_investment_assets(client_data)
        processed_super_c1, processed_super_c2 = process_superannuation_assets(client_data)
        
        # Create analysis result
        analysis_result = AnalysisResult(
            clientId=client_id,
            processedAt=datetime.now(),
            clientNamesSummary=client_names,
            restructuredData=restructured_data,
            retirementAnalysis=retirement_analysis,
            cashflowAnalysis=cashflow_analysis,
            debtAnalysis=debt_analysis,
            coverageGaps=coverage_gaps,
            strategies=strategies,
            objectives=objectives,
            client1Recommendations=client1_recs,
            client2Recommendations=client2_recs,
            riskProfile=risk_profile,
            processedLifestyleAssets=processed_lifestyle,
            processedInvestmentAssetsClient1=processed_inv_c1,
            processedInvestmentAssetsClient2=processed_inv_c2,
            processedSuperAssetsClient1=processed_super_c1,
            processedSuperAssetsClient2=processed_super_c2
        )
        
        # Save analysis result
        storage.save_analysis(analysis_result)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(f"Analysis completed in {processing_time:.0f}ms")
        
        return {
            "status": "success",
            "client_id": client_id,
            "processing_time_ms": processing_time,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Analysis failed for client {client_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis/{client_id}")
async def get_analysis(client_id: str):
    """Get analysis results for a client"""
    analysis = storage.load_analysis(client_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis

@app.get("/status/{client_id}")
async def get_status(client_id: str):
    """Get processing status for a client"""
    client_exists = storage.client_exists(client_id)
    analysis_exists = storage.analysis_exists(client_id)
    
    if not client_exists:
        return {
            "client_id": client_id,
            "status": "not_found",
            "has_analysis": False
        }
    
    if analysis_exists:
        analysis = storage.load_analysis(client_id)
        return {
            "client_id": client_id,
            "status": "completed",
            "has_analysis": True,
            "last_updated": analysis.processedAt.isoformat() if analysis else None
        }
    
    return {
        "client_id": client_id,
        "status": "pending",
        "has_analysis": False
    }

@app.post("/fact-find/upload")
async def upload_fact_find(file: UploadFile = File(...)):
    """
    Upload and process a fact find PDF document.
    The PDF will be processed through the ingestion pipeline and data will be sent to Supabase.
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Validate file size (max 50MB)
    file_content = await file.read()
    if len(file_content) > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    # Save to temporary file
    temp_file = None
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(file_content)
            temp_file = tmp.name
        
        logger.info(f"Processing fact find PDF: {file.filename}")
        
        # Import ingestion processing function
        # Note: We need to add the parent directory to the path to import ingestion
        import sys
        import os
        from config.settings import settings

        # INJECT API KEY HERE:
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key
        os.environ["OPENAI_MODEL"] = settings.openai_model

        parent_dir = Path(__file__).parent.parent
        if str(parent_dir) not in sys.path:
            sys.path.insert(0, str(parent_dir))
        
        from ingestion.main import process_fact_find_pdf
        
        # Add utils to path for import
        utils_path = Path(__file__).parent / "utils"
        if str(utils_path) not in sys.path:
            sys.path.insert(0, str(utils_path))
        from webhook_converter import convert_webhook_to_client_data
        
        # Process the PDF
        payload_dict = process_fact_find_pdf(temp_file)
        
        # Convert to ClientData format
        logger.info("Converting webhook payload to ClientData format...")
        client_data = convert_webhook_to_client_data(payload_dict)
        
        # Save to local storage
        logger.info(f"Saving client data for {client_data.id}...")
        storage.save_client(client_data)
        
        client_name = payload_dict.get("client1_name", "Unknown")
        logger.info(f"Successfully processed and saved fact find for {client_name} (ID: {client_data.id})")
        
        return {
            "status": "success",
            "message": f"Fact find processed successfully for {client_name}",
            "client_id": client_data.id,
            "client1_name": payload_dict.get("client1_name", ""),
            "client2_name": payload_dict.get("client2_name", ""),
            "filename": file.filename
        }
            
    except FileNotFoundError as e:
        logger.error(f"File not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        logger.error(f"Configuration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Configuration error: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing fact find: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing fact find: {str(e)}")
    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file: {str(e)}")

# ========== Knowledge Base / Template Endpoints ==========

@app.get("/knowledge-base/templates")
async def list_templates():
    """
    List all available document templates.
    Returns templates with their metadata and mapping status.
    """
    try:
        templates = storage.list_templates()
        
        # Convert to TemplateProfile format
        documents = []
        for template in templates:
            # Load word count if not present
            if "word_count" not in template:
                template_path = storage.load_template_file(template["template_id"])
                if template_path:
                    try:
                        stats = placeholder_extractor.get_document_stats(str(template_path))
                        template["word_count"] = stats.get("word_count", 0)
                    except Exception:
                        template["word_count"] = 0
            
            documents.append({
                "document_id": template.get("template_id"),
                "display_name": template.get("display_name", template.get("source_filename", "Unknown")),
                "source_filename": template.get("source_filename", ""),
                "file_extension": "docx",
                "file_size": template.get("file_size", 0),
                "word_count": template.get("word_count", 0),
                "uploaded_at": template.get("uploaded_at", ""),
                "description": template.get("description"),
                "tags": template.get("tags"),
                "client_ids": template.get("client_ids"),
                "page_count": template.get("page_count"),
                "has_mapping": template.get("has_mapping", False)
            })
        
        return {"documents": documents}
    
    except Exception as e:
        logger.error(f"Failed to list templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/knowledge-base/upload")
async def upload_template(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    client_ids: Optional[str] = Form(None)
):
    """
    Upload a new document template (.docx file).
    
    Args:
        file: The .docx file to upload
        description: Optional description of the template
        client_ids: Optional JSON array of client IDs this template is for
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.docx'):
        raise HTTPException(
            status_code=400, 
            detail="Only .docx (Word) files are allowed"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Validate file size (max 10MB)
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400, 
            detail="File size exceeds 10MB limit"
        )
    
    try:
        # Generate unique template ID
        template_id = str(uuid.uuid4()).replace("-", "")[:16]
        
        # Parse client_ids if provided
        parsed_client_ids = None
        if client_ids:
            try:
                parsed_client_ids = json.loads(client_ids)
            except json.JSONDecodeError:
                pass
        
        # Create display name from filename
        display_name = Path(file.filename).stem.replace("_", " ").replace("-", " ").title()
        
        # Prepare metadata
        metadata = {
            "display_name": display_name,
            "description": description,
            "client_ids": parsed_client_ids
        }
        
        # Save the template file
        file_path = storage.save_template_file(
            template_id, 
            file_content, 
            file.filename,
            metadata
        )
        
        # Get document stats
        try:
            stats = placeholder_extractor.get_document_stats(str(file_path))
            storage.update_template_metadata(template_id, {
                "word_count": stats.get("word_count", 0)
            })
        except Exception as e:
            logger.warning(f"Failed to get document stats: {str(e)}")
        
        # Build response
        template_meta = storage.load_template_metadata(template_id)
        
        document = TemplateProfile(
            document_id=template_id,
            display_name=display_name,
            source_filename=file.filename,
            file_extension="docx",
            file_size=len(file_content),
            word_count=template_meta.get("word_count", 0) if template_meta else 0,
            uploaded_at=datetime.now(),
            description=description,
            client_ids=parsed_client_ids,
            has_mapping=False
        )
        
        logger.info(f"Uploaded template: {template_id} ({file.filename})")
        
        return UploadTemplateResponse(
            status="success",
            document=document
        )
    
    except Exception as e:
        logger.error(f"Failed to upload template: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/knowledge-base/templates/{template_id}/extract-placeholders")
async def extract_placeholders(template_id: str):
    """
    Extract all placeholders from a template document.
    
    Returns the list of placeholders and a signature for change detection.
    """
    # Check template exists
    template_path = storage.load_template_file(template_id)
    if not template_path:
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        # Extract placeholders
        placeholders = placeholder_extractor.extract_placeholders(str(template_path))
        
        # Calculate signature
        signature = placeholder_extractor.calculate_signature(placeholders)
        
        return ExtractPlaceholdersResponse(
            placeholders=placeholders,
            signature=signature
        )
    
    except Exception as e:
        logger.error(f"Failed to extract placeholders: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/knowledge-base/templates/{template_id}/auto-map")
async def auto_map_placeholders(template_id: str, request: AutoMapRequest):
    """
    Automatically map template placeholders to client data fields.
    
    Args:
        template_id: Template identifier
        request: Contains client_id to use for mapping
    """
    # Check template exists
    template_path = storage.load_template_file(template_id)
    if not template_path:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Load client data
    client_data = storage.load_client(request.client_id)
    if not client_data:
        raise HTTPException(status_code=404, detail="Client not found")
    
    try:
        # Extract placeholders
        placeholders = placeholder_extractor.extract_placeholders(str(template_path))
        
        # Convert client data to dict for mapping
        client_dict = client_data.model_dump()
        
        # Auto-map placeholders
        mappings = mapping_engine.auto_map_placeholders(placeholders, client_dict)
        
        # Convert to response format
        mapping_entries = {
            placeholder: MappingEntry(
                field=entry.field,
                type=entry.type,
                isCustom=entry.isCustom,
                customValue=entry.customValue,
                confidence=entry.confidence,
                format=entry.format
            )
            for placeholder, entry in mappings.items()
        }
        
        return AutoMapResponse(
            mappings=mapping_entries,
            placeholders=placeholders
        )
    
    except Exception as e:
        logger.error(f"Failed to auto-map placeholders: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/knowledge-base/templates/{template_id}/mapping")
async def get_template_mapping(template_id: str):
    """
    Get the saved mapping configuration for a template.
    """
    # Check template exists
    if not storage.template_exists(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Load mapping
    mapping = storage.load_template_mapping(template_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="No mapping found for this template")
    
    return mapping


@app.post("/knowledge-base/templates/{template_id}/mapping")
async def save_template_mapping(template_id: str, mapping_config: dict):
    """
    Save a mapping configuration for a template.
    
    The mapping will be reused when generating documents from this template.
    """
    # Check template exists
    if not storage.template_exists(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        # Ensure template_id is in the config
        mapping_config["template_id"] = template_id
        
        # Save mapping
        storage.save_template_mapping(template_id, mapping_config)
        
        return {"status": "success", "template_id": template_id}
    
    except Exception as e:
        logger.error(f"Failed to save mapping: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/knowledge-base/templates/{template_id}/mapping")
async def delete_template_mapping(template_id: str):
    """
    Delete the saved mapping for a template.
    This allows users to start fresh with a new mapping.
    """
    if not storage.template_exists(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    
    deleted = storage.delete_template_mapping(template_id)
    
    if deleted:
        return {"status": "deleted", "template_id": template_id}
    else:
        raise HTTPException(status_code=404, detail="No mapping found to delete")


@app.post("/knowledge-base/templates/{template_id}/validate-mapping")
async def validate_template_mapping(template_id: str, request: ValidateMappingRequest):
    """
    Validate a saved mapping against current template placeholders.
    
    Used to detect if a template has been modified since the mapping was saved.
    """
    # Check template exists
    if not storage.template_exists(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Load saved mapping
    saved_mapping = storage.load_template_mapping(template_id)
    if not saved_mapping:
        return ValidateMappingResponse(
            valid=False,
            reason="no_mapping"
        )
    
    try:
        # Calculate current signature
        current_signature = placeholder_extractor.calculate_signature(request.placeholders)
        saved_signature = saved_mapping.get("placeholder_signature", "")
        
        if current_signature != saved_signature:
            # Template has changed - identify differences
            saved_placeholders = set(saved_mapping.get("mappings", {}).keys())
            current_placeholders = set(request.placeholders)
            
            missing = list(current_placeholders - saved_placeholders)
            extra = list(saved_placeholders - current_placeholders)
            
            return ValidateMappingResponse(
                valid=False,
                reason="template_changed",
                saved_mapping=saved_mapping,
                missing_placeholders=missing,
                extra_placeholders=extra
            )
        
        # Check all placeholders are mapped
        mappings = saved_mapping.get("mappings", {})
        unmapped = []
        for placeholder in request.placeholders:
            if placeholder not in mappings:
                unmapped.append(placeholder)
            else:
                entry = mappings[placeholder]
                if not entry.get("field") and not entry.get("customValue"):
                    unmapped.append(placeholder)
        
        if unmapped:
            return ValidateMappingResponse(
                valid=False,
                reason="incomplete_mapping",
                saved_mapping=saved_mapping,
                missing_placeholders=unmapped
            )
        
        return ValidateMappingResponse(
            valid=True,
            saved_mapping=saved_mapping
        )
    
    except Exception as e:
        logger.error(f"Failed to validate mapping: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/knowledge-base/templates/{template_id}/generate")
async def generate_document(template_id: str, request: GenerateDocumentRequest):
    """
    Generate a completed document by replacing placeholders with values.
    
    Args:
        template_id: Template identifier
        request: Contains client_id, mappings, and save_mapping flag
    """
    # Check template exists
    template_path = storage.load_template_file(template_id)
    if not template_path:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Load client data
    client_data = storage.load_client(request.client_id)
    if not client_data:
        raise HTTPException(status_code=404, detail="Client not found")
    
    try:
        # Convert client data to dict
        client_dict = client_data.model_dump()
        
        # Convert request mappings to MappingEntry format
        mapping_entries = {
            placeholder: MappingEntry(**entry) if isinstance(entry, dict) else entry
            for placeholder, entry in request.mappings.items()
        }
        
        # Resolve all mapping values
        resolved_values = mapping_engine.resolve_all_mappings(mapping_entries, client_dict)
        
        # Generate the document
        document_bytes = document_generator.generate_document(
            str(template_path),
            resolved_values
        )
        
        # Save the generated document
        generated_path = storage.save_generated_document(
            template_id,
            request.client_id,
            document_bytes
        )
        
        # Save mapping if requested
        if request.save_mapping:
            # Get current placeholders and signature
            placeholders = list(request.mappings.keys())
            signature = placeholder_extractor.calculate_signature(placeholders)
            
            # Get template name
            template_meta = storage.load_template_metadata(template_id)
            template_name = template_meta.get("display_name", template_id) if template_meta else template_id
            
            mapping_config = {
                "template_id": template_id,
                "template_name": template_name,
                "mappings": {
                    p: e.model_dump() if hasattr(e, 'model_dump') else e
                    for p, e in mapping_entries.items()
                },
                "placeholder_signature": signature
            }
            
            storage.save_template_mapping(template_id, mapping_config)
        
        # Build download URL
        download_url = f"/knowledge-base/templates/{template_id}/generated/{generated_path.name}"
        
        logger.info(f"Generated document for client {request.client_id} from template {template_id}")
        
        return GenerateDocumentResponse(
            status="success",
            download_url=download_url,
            file_path=str(generated_path),
            generated_at=datetime.now()
        )
    
    except Exception as e:
        logger.error(f"Failed to generate document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/knowledge-base/templates/{template_id}/generated/{filename}")
async def download_generated_document(template_id: str, filename: str):
    """
    Download a generated document.
    """
    # Load the document
    document_bytes = storage.load_generated_document(filename)
    
    if not document_bytes:
        raise HTTPException(status_code=404, detail="Generated document not found")
    
    # Return as downloadable file
    return Response(
        content=document_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@app.get("/knowledge-base/templates/{template_id}/available-fields")
async def get_available_fields(template_id: str):
    """
    Get list of available client data fields for mapping.
    Used to populate dropdown options in the UI.
    """
    if not storage.template_exists(template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    
    fields = mapping_engine.get_available_fields()
    return {"fields": fields}


@app.delete("/knowledge-base/templates/{template_id}")
async def delete_template(template_id: str):
    """
    Delete a template and all associated files.
    """
    deleted = storage.delete_template(template_id)
    
    if deleted:
        return {"status": "deleted", "template_id": template_id}
    else:
        raise HTTPException(status_code=404, detail="Template not found")


# ========== Knowledge Base Document Endpoints ==========

@app.get("/knowledge-base/documents")
async def list_kb_documents():
    """
    List all knowledge base documents (separate from templates).
    """
    try:
        documents = storage.list_kb_documents()
        return {"documents": documents}
    except Exception as e:
        logger.error(f"Failed to list KB documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/knowledge-base/documents/upload")
async def upload_kb_document(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None)
):
    """
    Upload a knowledge base document (PDF, TXT, MD, DOCX).
    Extracts text and stores for embedding generation.
    """
    # Validate file type
    allowed_extensions = ['.pdf', '.txt', '.md', '.docx']
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Only {', '.join(allowed_extensions)} files are allowed"
        )
    
    # Validate file size (max 50MB)
    file_content = await file.read()
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    try:
        # Generate unique document ID
        document_id = f"kb_{uuid.uuid4().hex[:16]}"
        
        # Extract text based on file type
        text_content = ""
        if ext == '.pdf':
            import sys
            parent_dir = Path(__file__).parent.parent
            if str(parent_dir) not in sys.path:
                sys.path.insert(0, str(parent_dir))
            from ingestion.pdf_parser import PDFParser
            # Save to temp file for parsing
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name
            try:
                parser = PDFParser(str(tmp_path))
                text_content = parser.extract_text()
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        elif ext == '.txt':
            text_content = file_content.decode('utf-8')
        elif ext == '.md':
            text_content = file_content.decode('utf-8')
        elif ext == '.docx':
            from docx import Document
            import io
            doc = Document(io.BytesIO(file_content))
            text_content = '\n'.join([para.text for para in doc.paragraphs])
        
        if not text_content.strip():
            raise HTTPException(status_code=400, detail="No text content extracted from document")
        
        # Save document
        metadata = {
            "description": description,
            "file_type": ext[1:]  # Remove dot
        }
        paths = storage.save_kb_document(
            document_id,
            file_content,
            file.filename,
            text_content,
            metadata
        )
        
        logger.info(f"Uploaded KB document: {document_id} ({file.filename})")
        
        return {
            "status": "success",
            "document_id": document_id,
            "filename": file.filename,
            "text_length": len(text_content)
        }
    
    except Exception as e:
        logger.error(f"Failed to upload KB document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/knowledge-base/documents/{document_id}/generate-embeddings")
async def generate_kb_embeddings(document_id: str):
    """
    Generate embeddings for a knowledge base document.
    """
    if not storage.kb_document_exists(document_id):
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        # Load document text
        text_content = storage.load_kb_text(document_id)
        if not text_content:
            raise HTTPException(status_code=404, detail="Document text not found")
        
        # Load metadata
        meta_path = storage.kb_profiles_dir / f"{document_id}_meta.json"
        metadata = {}
        if meta_path.exists():
            with open(meta_path, 'r') as f:
                metadata = json.load(f)
        
        # Generate embeddings
        logger.info(f"Generating embeddings for document {document_id}...")
        embeddings_data = embedding_service.generate_embeddings_for_document(
            document_id,
            text_content,
            metadata
        )
        
        # Save embeddings
        embedding_service.save_embeddings(
            embeddings_data,
            storage.kb_embeddings_dir
        )
        
        logger.info(f"Generated {len(embeddings_data)} embeddings for document {document_id}")
        
        return {
            "status": "success",
            "document_id": document_id,
            "chunks": len(embeddings_data)
        }
    
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/knowledge-base/search", response_model=KBSearchResponse)
async def search_kb(request: KBSearchRequest):
    """
    Search knowledge base documents using semantic similarity.
    """
    try:
        search_results = embedding_service.search(
            request.query,
            storage.kb_embeddings_dir,
            limit=request.limit
        )
        
        # Convert to response model
        results = [
            KBSearchResult(
                chunk_id=r["chunk_id"],
                document_id=r["document_id"],
                chunk_index=r["chunk_index"],
                text=r["text"],
                similarity=r["similarity"],
                metadata=r.get("metadata", {})
            )
            for r in search_results
        ]
        
        return KBSearchResponse(
            query=request.query,
            results=results,
            count=len(results)
        )
    
    except Exception as e:
        logger.error(f"KB search failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/knowledge-base/documents/{document_id}")
async def delete_kb_document(document_id: str):
    """
    Delete a knowledge base document and all associated files.
    """
    deleted = storage.delete_kb_document(document_id)
    
    if deleted:
        return {"status": "deleted", "document_id": document_id}
    else:
        raise HTTPException(status_code=404, detail="Document not found")


# Helper functions for Step 11 (asset processing)

def process_lifestyle_assets(client_data: ClientData) -> list[ProcessedAsset]:
    """Process lifestyle assets (up to 5)"""
    assets = []
    for i, asset in enumerate(client_data.detailedAssets.lifestyleAssets[:5]):
        assets.append(ProcessedAsset(
            exists=True,
            description=asset.name,
            value=asset.value
        ))
    # Fill remaining slots
    while len(assets) < 5:
        assets.append(ProcessedAsset(exists=False, description="", value=0.0))
    return assets

def process_investment_assets(client_data: ClientData) -> tuple[list[ProcessedAsset], list[ProcessedAsset]]:
    """Process investment assets for both clients (up to 3 each)"""
    client1_assets = []
    client2_assets = []
    
    for asset in client_data.detailedAssets.investmentAssets:
        processed = ProcessedAsset(
            exists=True,
            description=asset.name,
            value=asset.value
        )
        if "client 1" in asset.owner.lower() or client_data.clientInfo.client1.name.lower() in asset.owner.lower():
            if len(client1_assets) < 3:
                client1_assets.append(processed)
        elif "client 2" in asset.owner.lower() or (client_data.clientInfo.client2 and client_data.clientInfo.client2.name.lower() in asset.owner.lower()):
            if len(client2_assets) < 3:
                client2_assets.append(processed)
        else:
            # Default to client 1 if unclear
            if len(client1_assets) < 3:
                client1_assets.append(processed)
    
    # Fill remaining slots
    while len(client1_assets) < 3:
        client1_assets.append(ProcessedAsset(exists=False, description="", value=0.0))
    while len(client2_assets) < 3:
        client2_assets.append(ProcessedAsset(exists=False, description="", value=0.0))
    
    return client1_assets, client2_assets

def process_superannuation_assets(client_data: ClientData) -> tuple[list[ProcessedAsset], list[ProcessedAsset]]:
    """Process superannuation assets for both clients (up to 2 each)"""
    client1_assets = []
    client2_assets = []
    
    for asset in client_data.detailedAssets.superannuationAssets:
        processed = ProcessedAsset(
            exists=True,
            description=asset.fundName,
            value=asset.balance
        )
        if "client 1" in asset.owner.lower() or client_data.clientInfo.client1.name.lower() in asset.owner.lower():
            if len(client1_assets) < 2:
                client1_assets.append(processed)
        elif "client 2" in asset.owner.lower() or (client_data.clientInfo.client2 and client_data.clientInfo.client2.name.lower() in asset.owner.lower()):
            if len(client2_assets) < 2:
                client2_assets.append(processed)
    
    # Fill remaining slots
    while len(client1_assets) < 2:
        client1_assets.append(ProcessedAsset(exists=False, description="", value=0.0))
    while len(client2_assets) < 2:
        client2_assets.append(ProcessedAsset(exists=False, description="", value=0.0))
    
    return client1_assets, client2_assets

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



