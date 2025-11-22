from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging
from typing import Optional

from models.data_models import ClientData, AnalysisResult, ProcessedAsset
from processors.ai_processor import AIProcessor
from storage.local_storage import LocalStorage
from config.settings import settings

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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
storage = LocalStorage(data_dir=settings.data_dir)
ai_processor = AIProcessor(api_key=settings.openai_api_key, model=settings.openai_model)

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

