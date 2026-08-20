"""
Document management endpoints.
"""
import os
import json
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.schemas import DocumentResponse, DocumentUpdate
from app.core.dependencies import get_current_user, require_admin
from app.core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    categorie: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all documents (all authenticated users)."""
    query = db.query(Document)
    
    if categorie:
        query = query.filter(Document.categorie == categorie)
    if search:
        query = query.filter(Document.nom.ilike(f"%{search}%"))
    
    documents = query.order_by(Document.date_import.desc()).all()
    return documents


@router.get("/categories", response_model=List[str])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all document categories."""
    categories = db.query(Document.categorie).distinct().all()
    return [c[0] for c in categories]


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    nom: str = Form(...),
    categorie: str = Form("Général"),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Upload and process a PDF document (admin only)."""
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seuls les fichiers PDF sont acceptés",
        )
    
    # Create upload directory if it doesn't exist
    upload_dir = settings.DOCUMENTS_PATH
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create document record
    document = Document(
        nom=nom,
        chemin=file_path,
        categorie=categorie,
        description=description,
        taille=len(content),
        statut="actif",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Trigger RAG indexing pipeline
    try:
        from app.rag.pdf_processor import extract_text_from_pdf, chunk_text
        from app.rag.embeddings import embeddings_manager

        pages = extract_text_from_pdf(file_path)
        chunks = chunk_text(pages)
        if chunks:
            embeddings_manager.add_document_chunks(document.id, document.nom, chunks)
        document.statut = "indexé"
    except Exception as e:
        print(f"Erreur d'indexation du document {document.id}: {e}")
        document.statut = "erreur"
    
    db.commit()
    db.refresh(document)
    
    return document


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé",
        )
    return document


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Télécharger le fichier PDF physique associé au document."""
    from fastapi.responses import FileResponse
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé",
        )
    if not os.path.exists(document.chemin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier PDF physique non trouvé sur le serveur",
        )
    
    return FileResponse(
        path=document.chemin,
        filename=os.path.basename(document.chemin),
        media_type="application/pdf"
    )


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    doc_data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a document (admin only)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé",
        )
    
    if doc_data.nom is not None:
        document.nom = doc_data.nom
    if doc_data.categorie is not None:
        document.categorie = doc_data.categorie
    if doc_data.description is not None:
        document.description = doc_data.description
    
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a document and its index (admin only)."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé",
        )
    
    # Delete the file if it exists
    if os.path.exists(document.chemin):
        os.remove(document.chemin)
    
    # Remove from ChromaDB vector store
    try:
        from app.rag.embeddings import embeddings_manager
        embeddings_manager.delete_document(document.id)
    except Exception as e:
        print(f"Erreur lors de la suppression de l'index du document {document.id}: {e}")
    
    db.delete(document)
    db.commit()
