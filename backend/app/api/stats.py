"""
Dashboard statistics endpoint.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

from app.database.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.conversation import Conversation
from app.schemas.schemas import DashboardStats
from app.core.dependencies import require_admin

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get dashboard statistics (admin only)."""
    total_users = db.query(func.count(User.id)).scalar()
    total_technicians = db.query(func.count(User.id)).filter(
        User.role == "technicien"
    ).scalar()
    total_conversations = db.query(func.count(Conversation.id)).scalar()
    total_documents = db.query(func.count(Document.id)).scalar()
    
    # Conversations by date (last 7 days)
    conversations_by_date = []
    for i in range(6, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        count = db.query(func.count(Conversation.id)).filter(
            Conversation.date_creation >= date_start,
            Conversation.date_creation <= date_end,
        ).scalar()
        conversations_by_date.append({
            "date": date_start.strftime("%d/%m"),
            "count": count,
        })
    
    # Documents by category
    docs_by_cat = db.query(
        Document.categorie, func.count(Document.id)
    ).group_by(Document.categorie).all()
    documents_by_category = [
        {"categorie": cat, "count": count} for cat, count in docs_by_cat
    ]
    
    return DashboardStats(
        total_users=total_users,
        total_technicians=total_technicians,
        total_conversations=total_conversations,
        total_documents=total_documents,
        conversations_by_date=conversations_by_date,
        documents_by_category=documents_by_category,
    )
