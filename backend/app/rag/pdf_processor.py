"""
PDF text extraction and chunking for the RAG pipeline.
"""
from typing import List, Dict
from app.core.config import settings


def extract_text_from_pdf(file_path: str) -> List[Dict]:
    """
    Extract text from a PDF file, page by page.
    
    Returns:
        List of dicts with 'page' (int) and 'text' (str) keys.
    """
    try:
        import pdfplumber
        
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({
                        "page": i + 1,
                        "text": text.strip(),
                    })
        return pages
    except Exception as e:
        print(f"Erreur lors de l'extraction du PDF : {e}")
        # Fallback to PyPDF2
        try:
            from PyPDF2 import PdfReader
            
            pages = []
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({
                        "page": i + 1,
                        "text": text.strip(),
                    })
            return pages
        except Exception as e2:
            print(f"Erreur avec PyPDF2 également : {e2}")
            return []


def chunk_text(pages: List[Dict], chunk_size: int = None, chunk_overlap: int = None) -> List[Dict]:
    """
    Split extracted pages into smaller chunks for embedding.
    
    Each chunk retains its source page number.
    
    Returns:
        List of dicts with 'text', 'page', and 'chunk_index' keys.
    """
    if chunk_size is None:
        chunk_size = settings.CHUNK_SIZE
    if chunk_overlap is None:
        chunk_overlap = settings.CHUNK_OVERLAP
    
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        
        chunks = []
        chunk_index = 0
        for page_data in pages:
            page_chunks = splitter.split_text(page_data["text"])
            for chunk_text in page_chunks:
                chunks.append({
                    "text": chunk_text,
                    "page": page_data["page"],
                    "chunk_index": chunk_index,
                })
                chunk_index += 1
        
        return chunks
    except ImportError:
        # Fallback: simple chunking without LangChain
        chunks = []
        chunk_index = 0
        for page_data in pages:
            text = page_data["text"]
            for i in range(0, len(text), chunk_size - chunk_overlap):
                chunk = text[i:i + chunk_size]
                if chunk.strip():
                    chunks.append({
                        "text": chunk.strip(),
                        "page": page_data["page"],
                        "chunk_index": chunk_index,
                    })
                    chunk_index += 1
        return chunks
