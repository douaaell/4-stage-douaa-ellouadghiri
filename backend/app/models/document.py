"""
Document model — represents an imported PDF document.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nom = Column(String(255), nullable=False)
    chemin = Column(String(500), nullable=False)
    categorie = Column(String(100), nullable=False, default="Général")
    description = Column(Text, nullable=True)
    taille = Column(Integer, nullable=True)  # size in bytes
    statut = Column(String(20), nullable=False, default="actif")  # "actif" | "indexé" | "erreur"
    date_import = Column(DateTime, default=lambda: datetime.now(timezone.utc))
