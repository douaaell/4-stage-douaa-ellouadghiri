"""
Embedding generation and ChromaDB collection management.
"""
from typing import List, Dict, Optional
from app.core.config import settings


class EmbeddingsManager:
    """Manages document embeddings and ChromaDB storage."""
    
    def __init__(self):
        self._client = None
        self._collection = None
        self._embedding_function = None
    
    def _get_client(self):
        """Lazy-load ChromaDB client."""
        if self._client is None:
            import chromadb
            self._client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        return self._client
    
    def _get_embedding_function(self):
        """Lazy-load embedding function."""
        if self._embedding_function is None:
            from chromadb.utils import embedding_functions
            
            if settings.LLM_PROVIDER == "ollama":
                self._embedding_function = embedding_functions.OllamaEmbeddingFunction(
                    url=f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                    model_name=settings.OLLAMA_MODEL,
                )
            elif settings.LLM_PROVIDER == "openai":
                self._embedding_function = embedding_functions.OpenAIEmbeddingFunction(
                    api_key=settings.OPENAI_API_KEY,
                    model_name="text-embedding-3-small"
                )
            else:
                # Fallback for other providers
                self._embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name=settings.EMBEDDING_MODEL
                )
        return self._embedding_function
    
    def _get_collection(self):
        """Get or create the document collection."""
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name="documents",
                embedding_function=self._get_embedding_function(),
            )
        return self._collection
    
    def add_document_chunks(
        self, document_id: int, document_name: str, chunks: List[Dict]
    ):
        """
        Add document chunks to ChromaDB.
        
        Args:
            document_id: Database ID of the document
            document_name: Name of the document
            chunks: List of dicts with 'text', 'page', 'chunk_index'
        """
        collection = self._get_collection()
        
        ids = [f"doc_{document_id}_chunk_{c['chunk_index']}" for c in chunks]
        texts = [c["text"] for c in chunks]
        metadatas = [
            {
                "document_id": document_id,
                "document_name": document_name,
                "page": c["page"],
                "chunk_index": c["chunk_index"],
            }
            for c in chunks
        ]
        
        collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
        )
    
    def search(self, query: str, top_k: int = None) -> List[Dict]:
        """
        Search for relevant document chunks.
        
        Returns:
            List of dicts with 'text', 'document_name', 'page', 'score'
        """
        if top_k is None:
            top_k = settings.TOP_K_RESULTS
        
        collection = self._get_collection()
        
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
        )
        
        retrieved = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0
                retrieved.append({
                    "text": doc,
                    "document_name": metadata.get("document_name", ""),
                    "page": metadata.get("page", 0),
                    "score": 1 - distance,  # Convert distance to similarity
                })
        
        return retrieved
    
    def delete_document(self, document_id: int):
        """Remove all chunks for a document from ChromaDB safely."""
        try:
            collection = self._get_collection()
            
            if collection.count() == 0:
                return
                
            # Fetch ALL documents to avoid C++ metadata filtering Segfault (ECONNRESET) on Python 3.13
            results = collection.get()
            
            if not results or not results.get("ids") or not results.get("metadatas"):
                return
                
            ids_to_delete = []
            for i, metadata in enumerate(results["metadatas"]):
                if metadata and metadata.get("document_id") == int(document_id):
                    ids_to_delete.append(results["ids"][i])
            
            if ids_to_delete:
                collection.delete(ids=ids_to_delete)
        except Exception as e:
            print(f"Avertissement lors de la suppression ChromaDB pour le document {document_id}: {e}")


# Singleton instance
embeddings_manager = EmbeddingsManager()
