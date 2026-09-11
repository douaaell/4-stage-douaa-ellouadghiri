"""
Conversation endpoints.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database.database import get_db
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.schemas import (
    ConversationResponse,
    ConversationDetailResponse,
    ConversationCreate,
    MessageResponse,
    MessageCreate,
    ChatResponse,
    SourceInfo,
)
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/conversations", tags=["Conversations"])


def _parse_sources(sources_json: str) -> list:
    """Parse JSON sources string into SourceInfo list."""
    if not sources_json:
        return []
    try:
        raw = json.loads(sources_json)
        res = []
        for s in raw:
            if isinstance(s, dict):
                res.append(SourceInfo(
                    titre=str(s.get("titre", "")),
                    page=str(s.get("page")) if s.get("page") is not None else None,
                    extrait=s.get("extrait"),
                ))
        return res
    except Exception:
        return []


@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List conversations. Technicians see only their own, admins see all."""
    query = db.query(Conversation)
    
    if current_user.role == "technicien":
        query = query.filter(Conversation.user_id == current_user.id)
    
    if search:
        query = query.filter(Conversation.titre.ilike(f"%{search}%"))
    
    conversations = query.order_by(Conversation.date_creation.desc()).all()
    
    result = []
    for conv in conversations:
        msg_count = db.query(func.count(Message.id)).filter(
            Message.conversation_id == conv.id
        ).scalar()
        
        user_nom = None
        if current_user.role == "administrateur" and conv.user:
            user_nom = conv.user.nom
        
        result.append(ConversationResponse(
            id=conv.id,
            user_id=conv.user_id,
            titre=conv.titre,
            date_creation=conv.date_creation,
            message_count=msg_count,
            user_nom=user_nom,
        ))
    
    return result


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    data: Optional[ConversationCreate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new conversation explicitly."""
    titre = data.titre if (data and data.titre) else "Nouvelle question"
    conversation = Conversation(
        user_id=current_user.id,
        titre=titre,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return ConversationResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        titre=conversation.titre,
        date_creation=conversation.date_creation,
        message_count=0,
        user_nom=current_user.nom,
    )


@router.post("/{conversation_id}/messages", response_model=ChatResponse)
def add_message(
    conversation_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Post a message to an existing conversation and generate RAG response."""
    from app.api.chat import _generate_rag_response

    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
    ).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation non trouvée",
        )

    if current_user.role == "technicien" and conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé",
        )

    # Generate response using RAG
    result = _generate_rag_response(data.question, db)

    # Update title from first question if default
    msg_count = db.query(func.count(Message.id)).filter(Message.conversation_id == conversation.id).scalar()
    if msg_count == 0 or conversation.titre in ["Nouvelle question", "Nouvelle conversation", "Sans titre"]:
        conversation.titre = data.question[:100] + ("..." if len(data.question) > 100 else "")

    sources_data = result.get("sources", [])
    message = Message(
        conversation_id=conversation.id,
        question=data.question,
        reponse=result["reponse"],
        sources=json.dumps(sources_data, ensure_ascii=False) if sources_data else None,
    )
    db.add(message)
    db.commit()

    return ChatResponse(
        conversation_id=conversation.id,
        question=data.question,
        reponse=result["reponse"],
        sources=[SourceInfo(**s) for s in sources_data],
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a conversation with all its messages."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation non trouvée",
        )
    
    # Technicians can only see their own conversations
    if current_user.role == "technicien" and conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé",
        )
    
    messages = []
    for msg in conversation.messages:
        messages.append(MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            question=msg.question,
            reponse=msg.reponse,
            sources=_parse_sources(msg.sources),
            date=msg.date,
        ))
    
    user_nom = conversation.user.nom if conversation.user else None
    
    return ConversationDetailResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        titre=conversation.titre,
        date_creation=conversation.date_creation,
        messages=messages,
        user_nom=user_nom,
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a conversation (Admin can delete any, technicians can delete their own)."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation non trouvée",
        )
    
    if current_user.role != "administrateur" and conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé",
        )
    
    db.delete(conversation)
    db.commit()
