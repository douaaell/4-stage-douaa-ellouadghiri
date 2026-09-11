"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, EmailStr


# ─── Auth ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ─── User ─────────────────────────────────────────────
class UserCreate(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    role: str = "technicien"
    statut: str = "actif"


class UserUpdate(BaseModel):
    nom: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    statut: Optional[str] = None
    mot_de_passe: Optional[str] = None


class ProfileUpdate(BaseModel):
    nom: Optional[str] = None
    email: Optional[str] = None
    mot_de_passe: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    nom: str
    email: str
    role: str
    statut: str
    date_creation: datetime

    class Config:
        from_attributes = True


# ─── Document ─────────────────────────────────────────
class DocumentCreate(BaseModel):
    nom: str
    categorie: str = "Général"
    description: Optional[str] = None


class DocumentUpdate(BaseModel):
    nom: Optional[str] = None
    categorie: Optional[str] = None
    description: Optional[str] = None


class DocumentResponse(BaseModel):
    id: int
    nom: str
    chemin: str
    categorie: str
    description: Optional[str]
    taille: Optional[int]
    statut: str
    date_import: datetime

    class Config:
        from_attributes = True


# ─── Conversation ─────────────────────────────────────
class ConversationCreate(BaseModel):
    titre: Optional[str] = "Nouvelle question"


class MessageCreate(BaseModel):
    question: str


class ConversationResponse(BaseModel):
    id: int
    user_id: int
    titre: str
    date_creation: datetime
    message_count: int = 0
    user_nom: Optional[str] = None

    class Config:
        from_attributes = True


class SourceInfo(BaseModel):
    titre: str
    page: Optional[Union[int, str]] = None
    extrait: Optional[str] = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    question: str
    reponse: str
    sources: Optional[List[SourceInfo]] = None
    date: datetime

    class Config:
        from_attributes = True


class ConversationDetailResponse(BaseModel):
    id: int
    user_id: int
    titre: str
    date_creation: datetime
    messages: List[MessageResponse]
    user_nom: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Chat ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[int] = None


class ChatResponse(BaseModel):
    conversation_id: int
    question: str
    reponse: str
    sources: List[SourceInfo]


# ─── Dashboard ────────────────────────────────────────
class DashboardStats(BaseModel):
    total_users: int
    total_technicians: int
    total_conversations: int
    total_documents: int
    conversations_by_date: List[dict] = []
    documents_by_category: List[dict] = []


# Forward reference update
TokenResponse.model_rebuild()
