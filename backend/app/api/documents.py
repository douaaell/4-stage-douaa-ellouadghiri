"""
Document management endpoints.
"""
import os
import json
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
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
def upload_document(
    nom: str = Form(...),
    categorie: str = Form("Général"),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Upload and process a PDF document (admin only)."""
    try:
        # Validate file type
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seuls les fichiers PDF sont acceptés",
            )
        
        # Create upload directory if it doesn't exist
        upload_dir = settings.DOCUMENTS_PATH
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, file.filename)
        content = file.file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Create document record — saved immediately so it appears in the list
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
        
        # Schedule indexing in a background task so the response returns immediately
        _run_indexing_background(document.id, document.nom, file_path)
        
        return document
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Erreur serveur lors de l'upload du document: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du traitement du fichier : {str(e)}",
        )


def _run_indexing_background(document_id: int, document_name: str, file_path: str):
    """Run indexing in a separate subprocess to fully isolate from ChromaDB C++ segfaults."""
    import subprocess
    import sys
    
    current_dir = os.path.abspath('.').replace('\\', '/')
    # Python script to run in subprocess — fully isolated from the main server
    script = f'''
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath("{current_dir}")))
os.chdir("{current_dir}")

from app.database.database import SessionLocal
from app.models.document import Document

db = SessionLocal()
try:
    from app.rag.pdf_processor import extract_text_from_pdf, chunk_text
    from app.rag.embeddings import embeddings_manager

    pages = extract_text_from_pdf(r"{file_path}")
    chunks = chunk_text(pages)

    if chunks:
        embeddings_manager.add_document_chunks({document_id}, "{document_name}", chunks)

    doc = db.query(Document).filter(Document.id == {document_id}).first()
    if doc:
        db.commit()
    print(f"Document {document_id} indexé avec succès ({{len(chunks)}} chunks)")
except Exception as e:
    print(f"Erreur d indexation: {{e}}")
    import traceback
    traceback.print_exc()
    try:
        doc = db.query(Document).filter(Document.id == {document_id}).first()
        if doc:
            doc.statut = "erreur"
            db.commit()
    except Exception:
        pass
finally:
    db.close()
'''
    
    # Launch as a completely separate process
    subprocess.Popen(
        [sys.executable, "-c", script],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
    )


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
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document non trouvé",
            )
        
        # Delete the file if it exists (safely catch Windows file locks)
        if document.chemin and os.path.exists(document.chemin):
            try:
                os.remove(document.chemin)
            except Exception as e_file:
                print(f"Avertissement: Impossible de supprimer le fichier physique {document.chemin}: {e_file}")
        
        # Remove from ChromaDB vector store
        try:
            from app.rag.embeddings import embeddings_manager
            # TEMPORARY FIX: ChromaDB 0.5.5 C++ bindings cause a fatal Python 3.13 crash (ECONNRESET) on Windows during delete/get.
            # We disable vector deletion to ensure the server never crashes.
            # The document is still deleted from the DB and UI.
            # embeddings_manager.delete_document(document.id)
            pass
        except Exception as e:
            print(f"Erreur lors de la suppression de l'index du document {document.id}: {e}")
        
        db.delete(document)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Erreur serveur lors de la suppression du document {document_id}: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression : {str(e)}",
        )
