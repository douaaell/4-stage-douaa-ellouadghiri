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
from app.schemas.schemas import ConversationResponse, ConversationDetailResponse, MessageResponse, SourceInfo
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/conversations", tags=["Conversations"])


def _parse_sources(sources_json: str) -> list:
    """Parse JSON sources string into SourceInfo list."""
    if not sources_json:
        return []
    try:
        return [SourceInfo(**s) for s in json.loads(sources_json)]
    except (json.JSONDecodeError, TypeError):
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
