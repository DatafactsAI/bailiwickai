"""
Service for generating embeddings for knowledge base documents using OpenAI.
"""
import logging
from typing import List, Dict, Any
from openai import OpenAI
from pathlib import Path
import json

try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False
    logging.warning("tiktoken not available, using simple text chunking")

logger = logging.getLogger(__name__)

# Token limit for embedding model (text-embedding-3-small supports up to 8191 tokens)
MAX_TOKENS_PER_CHUNK = 8000
CHUNK_OVERLAP = 200  # Overlap between chunks to maintain context


class EmbeddingService:
    """Service for generating and managing document embeddings"""
    
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        if TIKTOKEN_AVAILABLE:
            self.encoding = tiktoken.encoding_for_model("gpt-4")  # Use gpt-4 encoding as approximation
        else:
            self.encoding = None
    
    def chunk_text(self, text: str, max_tokens: int = MAX_TOKENS_PER_CHUNK) -> List[str]:
        """
        Split text into chunks that fit within token limits.
        
        Args:
            text: Text to chunk
            max_tokens: Maximum tokens per chunk
            
        Returns:
            List of text chunks
        """
        if not self.encoding:
            # Simple character-based chunking if tiktoken not available
            chunk_size = max_tokens * 4  # Rough estimate: 4 chars per token
            chunks = []
            for i in range(0, len(text), chunk_size - CHUNK_OVERLAP * 4):
                chunk = text[i:i + chunk_size]
                if chunk.strip():
                    chunks.append(chunk)
            return chunks if chunks else [text]
        
        # Token-based chunking with tiktoken
        sentences = text.split('. ')
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = len(self.encoding.encode(sentence))
            
            if current_tokens + sentence_tokens > max_tokens and current_chunk:
                # Save current chunk
                chunks.append('. '.join(current_chunk) + '.')
                # Start new chunk with overlap
                overlap_sentences = current_chunk[-3:] if len(current_chunk) >= 3 else current_chunk
                current_chunk = overlap_sentences + [sentence]
                current_tokens = sum(len(self.encoding.encode(s)) for s in current_chunk)
            else:
                current_chunk.append(sentence)
                current_tokens += sentence_tokens
        
        # Add final chunk
        if current_chunk:
            chunks.append('. '.join(current_chunk))
        
        return chunks if chunks else [text]
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text chunk.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as list of floats
        """
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            raise
    
    def generate_embeddings_for_document(
        self, 
        document_id: str, 
        text: str,
        metadata: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate embeddings for a document by chunking it and embedding each chunk.
        
        Args:
            document_id: Unique document identifier
            text: Full document text
            metadata: Optional metadata to include with each chunk
            
        Returns:
            List of chunk dictionaries with embeddings
        """
        chunks = self.chunk_text(text)
        embeddings_data = []
        
        for i, chunk in enumerate(chunks):
            try:
                embedding = self.generate_embedding(chunk)
                chunk_data = {
                    "chunk_id": f"{document_id}_chunk_{i}",
                    "document_id": document_id,
                    "chunk_index": i,
                    "text": chunk,
                    "embedding": embedding,
                    "metadata": metadata or {}
                }
                embeddings_data.append(chunk_data)
                logger.info(f"Generated embedding for chunk {i+1}/{len(chunks)} of document {document_id}")
            except Exception as e:
                logger.error(f"Failed to generate embedding for chunk {i}: {str(e)}")
                continue
        
        return embeddings_data
    
    def save_embeddings(
        self, 
        embeddings_data: List[Dict[str, Any]], 
        embeddings_dir: Path
    ) -> Path:
        """
        Save embeddings to a JSON file.
        
        Args:
            embeddings_data: List of chunk dictionaries with embeddings
            embeddings_dir: Directory to save embeddings in
            
        Returns:
            Path to saved embeddings file
        """
        embeddings_dir.mkdir(parents=True, exist_ok=True)
        
        if not embeddings_data:
            raise ValueError("No embeddings data to save")
        
        document_id = embeddings_data[0]["document_id"]
        embeddings_path = embeddings_dir / f"{document_id}_embeddings.json"
        
        with open(embeddings_path, 'w') as f:
            json.dump(embeddings_data, f, indent=2)
        
        logger.info(f"Saved {len(embeddings_data)} embeddings to {embeddings_path}")
        return embeddings_path
    
    def load_embeddings(self, document_id: str, embeddings_dir: Path) -> List[Dict[str, Any]]:
        """
        Load embeddings for a document.
        
        Args:
            document_id: Document identifier
            embeddings_dir: Directory containing embeddings
            
        Returns:
            List of chunk dictionaries with embeddings
        """
        embeddings_path = embeddings_dir / f"{document_id}_embeddings.json"
        
        if not embeddings_path.exists():
            return []
        
        with open(embeddings_path, 'r') as f:
            return json.load(f)
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Similarity score between -1 and 1
        """
        import math
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(a * a for a in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    def search(
        self, 
        query: str, 
        embeddings_dir: Path,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant document chunks using semantic similarity.
        
        Args:
            query: Search query text
            embeddings_dir: Directory containing embeddings
            limit: Maximum number of results to return
            
        Returns:
            List of relevant chunks with similarity scores, sorted by relevance
        """
        # Generate embedding for query
        query_embedding = self.generate_embedding(query)
        
        # Load all embeddings
        all_chunks = []
        for embeddings_file in embeddings_dir.glob("*_embeddings.json"):
            try:
                with open(embeddings_file, 'r') as f:
                    chunks = json.load(f)
                    all_chunks.extend(chunks)
            except Exception as e:
                logger.error(f"Failed to load embeddings from {embeddings_file}: {str(e)}")
                continue
        
        # Calculate similarity for each chunk
        results = []
        for chunk in all_chunks:
            similarity = self.cosine_similarity(query_embedding, chunk["embedding"])
            results.append({
                "chunk_id": chunk["chunk_id"],
                "document_id": chunk["document_id"],
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
                "similarity": similarity,
                "metadata": chunk.get("metadata", {})
            })
        
        # Sort by similarity (highest first) and return top results
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]

