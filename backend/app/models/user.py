"""
User model — represents both Technician and Administrator roles.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    mot_de_passe = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="technicien")  # "technicien" | "administrateur"
    statut = Column(String(20), nullable=False, default="actif")  # "actif" | "inactif"
    date_creation = Column(DateTime, default=lambda: datetime.now(timezone.utc))
