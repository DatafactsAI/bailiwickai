import json
import os
from pathlib import Path
from typing import Optional
from datetime import datetime
from models.data_models import ClientData, AnalysisResult

class LocalStorage:
    """Manages local JSON file storage for client data and analysis results"""
    
    def __init__(self, data_dir: str = "../data"):
        self.data_dir = Path(data_dir)
        self.clients_dir = self.data_dir / "clients"
        self.analysis_dir = self.data_dir / "analysis"
        
        # Ensure directories exist
        self.clients_dir.mkdir(parents=True, exist_ok=True)
        self.analysis_dir.mkdir(parents=True, exist_ok=True)
    
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
        return [f.stem.replace("client_", "") for f in client_files]
    
    def client_exists(self, client_id: str) -> bool:
        """Check if client data exists"""
        file_path = self.clients_dir / f"client_{client_id}.json"
        return file_path.exists()
    
    def analysis_exists(self, client_id: str) -> bool:
        """Check if analysis exists"""
        file_path = self.analysis_dir / f"client_{client_id}_analysis.json"
        return file_path.exists()

