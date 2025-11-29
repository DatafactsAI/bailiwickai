"""
Document Generator - Generates completed documents by replacing placeholders with values.
Handles Word document manipulation while preserving formatting.
"""

import logging
import re
from pathlib import Path
from typing import Dict, Optional
from io import BytesIO
from docx import Document
from docx.shared import Inches

logger = logging.getLogger(__name__)


class DocumentGenerator:
    """
    Generates completed documents by replacing placeholders with actual values.
    Preserves document formatting including bold, italic, fonts, etc.
    """
    
    # Regex pattern to match placeholders
    PLACEHOLDER_PATTERN = re.compile(r'<([a-zA-Z][a-zA-Z0-9_-]*)>')
    
    def __init__(self):
        pass
    
    def generate_document(
        self, 
        template_path: str, 
        resolved_values: Dict[str, str]
    ) -> bytes:
        """
        Generate a completed document by replacing placeholders with values.
        
        Args:
            template_path: Path to the template .docx file
            resolved_values: Dictionary mapping placeholders to resolved values
            
        Returns:
            Generated document as bytes
        """
        path = Path(template_path)
        if not path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")
        
        try:
            doc = Document(template_path)
        except Exception as e:
            logger.error(f"Failed to open template: {str(e)}")
            raise ValueError(f"Failed to open template: {str(e)}")
        
        # Replace in main document body paragraphs
        for paragraph in doc.paragraphs:
            self._replace_in_paragraph(paragraph, resolved_values)
        
        # Replace in tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        self._replace_in_paragraph(paragraph, resolved_values)
        
        # Replace in headers and footers
        for section in doc.sections:
            # Header
            if section.header:
                for paragraph in section.header.paragraphs:
                    self._replace_in_paragraph(paragraph, resolved_values)
                for table in section.header.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            for paragraph in cell.paragraphs:
                                self._replace_in_paragraph(paragraph, resolved_values)
            
            # Footer
            if section.footer:
                for paragraph in section.footer.paragraphs:
                    self._replace_in_paragraph(paragraph, resolved_values)
                for table in section.footer.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            for paragraph in cell.paragraphs:
                                self._replace_in_paragraph(paragraph, resolved_values)
        
        # Save to bytes
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        logger.info(f"Generated document with {len(resolved_values)} replacements")
        
        return buffer.read()
    
    def _replace_in_paragraph(
        self, 
        paragraph, 
        resolved_values: Dict[str, str]
    ) -> None:
        """
        Replace placeholders in a paragraph while preserving formatting.
        
        This method handles the case where placeholders might be split
        across multiple runs due to Word's internal formatting.
        
        Args:
            paragraph: Word paragraph object
            resolved_values: Dictionary mapping placeholders to values
        """
        # First, try simple replacement on the full paragraph text
        full_text = paragraph.text
        
        if not self.PLACEHOLDER_PATTERN.search(full_text):
            return
        
        # Check if we can do simple run-by-run replacement
        for placeholder, value in resolved_values.items():
            if placeholder in full_text:
                # Try to find and replace in individual runs first
                replaced = False
                for run in paragraph.runs:
                    if placeholder in run.text:
                        run.text = run.text.replace(placeholder, value)
                        replaced = True
                
                # If not replaced in runs, the placeholder might be split
                # We need to merge runs and replace
                if not replaced and placeholder in full_text:
                    self._replace_split_placeholder(paragraph, placeholder, value)
    
    def _replace_split_placeholder(
        self, 
        paragraph, 
        placeholder: str, 
        value: str
    ) -> None:
        """
        Handle the case where a placeholder is split across multiple runs.
        
        Word sometimes splits text across runs due to formatting or editing history.
        This method reconstructs the text, replaces the placeholder, and rebuilds
        the runs while trying to preserve formatting.
        
        Args:
            paragraph: Word paragraph object
            placeholder: The placeholder to replace
            value: The value to replace with
        """
        # Collect all run info
        runs_info = []
        for run in paragraph.runs:
            runs_info.append({
                'text': run.text,
                'bold': run.bold,
                'italic': run.italic,
                'underline': run.underline,
                'font_name': run.font.name,
                'font_size': run.font.size,
            })
        
        # Combine all text
        combined_text = ''.join(r['text'] for r in runs_info)
        
        if placeholder not in combined_text:
            return
        
        # Replace the placeholder
        new_text = combined_text.replace(placeholder, value)
        
        # Clear existing runs and add new one with the replaced text
        # We'll use the formatting of the first run
        if paragraph.runs:
            first_run_format = runs_info[0] if runs_info else {}
            
            # Clear all runs
            for run in paragraph.runs:
                run.text = ""
            
            # Set text on first run
            if paragraph.runs:
                paragraph.runs[0].text = new_text
                # Try to preserve formatting
                if first_run_format.get('bold'):
                    paragraph.runs[0].bold = first_run_format['bold']
                if first_run_format.get('italic'):
                    paragraph.runs[0].italic = first_run_format['italic']
    
    def preview_replacements(
        self, 
        template_path: str, 
        resolved_values: Dict[str, str]
    ) -> Dict[str, list]:
        """
        Preview what replacements will be made without actually modifying.
        
        Args:
            template_path: Path to the template .docx file
            resolved_values: Dictionary mapping placeholders to values
            
        Returns:
            Dictionary with lists of replacements by section
        """
        path = Path(template_path)
        if not path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")
        
        try:
            doc = Document(template_path)
        except Exception as e:
            raise ValueError(f"Failed to open template: {str(e)}")
        
        preview = {
            "body": [],
            "tables": [],
            "headers": [],
            "footers": []
        }
        
        # Check main document body
        for paragraph in doc.paragraphs:
            for placeholder, value in resolved_values.items():
                if placeholder in paragraph.text:
                    preview["body"].append({
                        "placeholder": placeholder,
                        "value": value,
                        "context": paragraph.text[:100] + ("..." if len(paragraph.text) > 100 else "")
                    })
        
        # Check tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for placeholder, value in resolved_values.items():
                            if placeholder in paragraph.text:
                                preview["tables"].append({
                                    "placeholder": placeholder,
                                    "value": value,
                                    "context": paragraph.text[:100]
                                })
        
        # Check headers/footers
        for section in doc.sections:
            if section.header:
                for paragraph in section.header.paragraphs:
                    for placeholder, value in resolved_values.items():
                        if placeholder in paragraph.text:
                            preview["headers"].append({
                                "placeholder": placeholder,
                                "value": value
                            })
            
            if section.footer:
                for paragraph in section.footer.paragraphs:
                    for placeholder, value in resolved_values.items():
                        if placeholder in paragraph.text:
                            preview["footers"].append({
                                "placeholder": placeholder,
                                "value": value
                            })
        
        return preview


