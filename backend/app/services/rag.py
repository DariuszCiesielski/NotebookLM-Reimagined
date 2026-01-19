"""
RAG Service - Chunking, Embeddings, and Vector Search
"""
import re
from typing import List, Dict, Optional
import google.generativeai as genai
from app.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.google_api_key)


class TextChunker:
    """Split text into overlapping chunks for better retrieval."""
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: List[str] = None
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]
    
    def split_text(self, text: str) -> List[Dict]:
        """Split text into chunks with metadata."""
        if not text or not text.strip():
            return []
        
        # Clean the text
        text = text.strip()
        
        # Split into initial chunks
        chunks = self._recursive_split(text, self.separators)
        
        # Create overlapping chunks
        result = []
        for i, chunk in enumerate(chunks):
            if chunk.strip():
                result.append({
                    "chunk_index": i,
                    "content": chunk.strip(),
                    "token_count": self._estimate_tokens(chunk)
                })
        
        return result
    
    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """Recursively split text using separators."""
        if not separators:
            # No more separators, split by character count
            return self._split_by_size(text)
        
        separator = separators[0]
        remaining_separators = separators[1:]
        
        if separator == "":
            return self._split_by_size(text)
        
        splits = text.split(separator)
        
        chunks = []
        current_chunk = ""
        
        for split in splits:
            potential_chunk = current_chunk + separator + split if current_chunk else split
            
            if len(potential_chunk) <= self.chunk_size:
                current_chunk = potential_chunk
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                
                if len(split) > self.chunk_size:
                    # Recursively split large pieces
                    sub_chunks = self._recursive_split(split, remaining_separators)
                    chunks.extend(sub_chunks[:-1] if sub_chunks else [])
                    current_chunk = sub_chunks[-1] if sub_chunks else ""
                else:
                    current_chunk = split
        
        if current_chunk:
            chunks.append(current_chunk)
        
        # Add overlap
        return self._add_overlap(chunks)
    
    def _split_by_size(self, text: str) -> List[str]:
        """Split text by character size."""
        chunks = []
        for i in range(0, len(text), self.chunk_size - self.chunk_overlap):
            chunk = text[i:i + self.chunk_size]
            if chunk:
                chunks.append(chunk)
        return chunks
    
    def _add_overlap(self, chunks: List[str]) -> List[str]:
        """Add overlap between chunks."""
        if len(chunks) <= 1:
            return chunks
        
        result = []
        for i, chunk in enumerate(chunks):
            if i > 0 and self.chunk_overlap > 0:
                # Add end of previous chunk as prefix
                prev_chunk = chunks[i - 1]
                overlap_text = prev_chunk[-self.chunk_overlap:] if len(prev_chunk) > self.chunk_overlap else prev_chunk
                chunk = overlap_text + " " + chunk
            result.append(chunk)
        
        return result
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation)."""
        # Roughly 4 characters per token for English
        return len(text) // 4


class EmbeddingService:
    """Generate embeddings using Google's text-embedding-004 model."""
    
    MODEL_NAME = "models/text-embedding-004"
    EMBEDDING_DIM = 768
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            return [0.0] * self.EMBEDDING_DIM
        
        # Truncate very long texts
        text = text[:10000]
        
        result = genai.embed_content(
            model=self.MODEL_NAME,
            content=text,
            task_type="retrieval_document"
        )
        
        return result['embedding']
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        embeddings = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for a search query."""
        if not query or not query.strip():
            return [0.0] * self.EMBEDDING_DIM
        
        result = genai.embed_content(
            model=self.MODEL_NAME,
            content=query,
            task_type="retrieval_query"
        )
        
        return result['embedding']


class RAGService:
    """Main RAG service combining chunking, embeddings, and search."""
    
    def __init__(self):
        self.chunker = TextChunker(chunk_size=1000, chunk_overlap=200)
        self.embedding_service = EmbeddingService()
    
    async def process_source(
        self,
        source_id: str,
        content: str,
        supabase_client
    ) -> int:
        """
        Process a source: chunk it, generate embeddings, and store in database.
        Returns the number of chunks created.
        """
        # 1. Chunk the content
        chunks = self.chunker.split_text(content)
        
        if not chunks:
            return 0
        
        # 2. Generate embeddings for each chunk
        chunk_contents = [c["content"] for c in chunks]
        embeddings = await self.embedding_service.generate_embeddings_batch(chunk_contents)
        
        # 3. Store chunks with embeddings in database
        chunk_records = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_records.append({
                "source_id": source_id,
                "chunk_index": chunk["chunk_index"],
                "content": chunk["content"],
                "embedding": embedding,
                "token_count": chunk["token_count"],
                "metadata": {}
            })
        
        # Insert chunks in batches
        batch_size = 50
        for i in range(0, len(chunk_records), batch_size):
            batch = chunk_records[i:i + batch_size]
            supabase_client.table("source_chunks").insert(batch).execute()
        
        return len(chunk_records)
    
    async def search(
        self,
        query: str,
        notebook_id: str,
        supabase_client,
        source_ids: List[str] = None,
        match_count: int = 5
    ) -> List[Dict]:
        """
        Search for relevant chunks using vector similarity.
        """
        # 1. Generate query embedding
        query_embedding = await self.embedding_service.generate_query_embedding(query)
        
        # 2. Call the vector search function
        params = {
            "query_embedding": query_embedding,
            "match_count": match_count,
            "p_notebook_id": notebook_id
        }
        
        if source_ids:
            params["p_source_ids"] = source_ids
        
        result = supabase_client.rpc("match_source_chunks", params).execute()
        
        return result.data or []
    
    async def delete_source_chunks(self, source_id: str, supabase_client):
        """Delete all chunks for a source."""
        supabase_client.table("source_chunks").delete().eq("source_id", source_id).execute()


# Singleton instance
rag_service = RAGService()
