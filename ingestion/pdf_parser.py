import fitz  # PyMuPDF
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PDFParser:
    """Handles PDF file reading and text extraction."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        
    def extract_text(self) -> str:
        """
        Extracts text from the PDF file.
        
        Returns:
            str: Combined text content from all pages.
            
        Raises:
            FileNotFoundError: If the file does not exist.
            Exception: If PDF parsing fails.
        """
        try:
            doc = fitz.open(self.file_path)
            full_text = []
            
            logger.info(f"Processing PDF: {self.file_path} ({len(doc)} pages)")
            
            for page_num, page in enumerate(doc):
                text = page.get_text()
                full_text.append(text)
                logger.debug(f"Extracted {len(text)} chars from page {page_num + 1}")
                
            combined_text = "\n".join(full_text)
            
            if not combined_text.strip():
                logger.warning("Warning: No text extracted from PDF. The file might be scanned images.")
                
            return combined_text
            
        except Exception as e:
            logger.error(f"Failed to extract text from {self.file_path}: {str(e)}")
            raise



