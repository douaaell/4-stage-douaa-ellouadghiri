"""
Database seed script — creates the initial admin account.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database.database import SessionLocal, init_db
from app.models.user import User
from app.core.security import get_password_hash


def seed_database():
    """Populate the database with sample data."""
    init_db()
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(User).count() > 0:
            print("La base de données contient déjà des données. Seed ignoré.")
            return
        
        print("Création du compte administrateur par défaut...")
        
        # ─── Users ────────────────────────────────────────
        admin = User(
            nom="Admin Principal",
            email="admin@electricite.com",
            mot_de_passe=get_password_hash("admin123"),
            role="administrateur",
            statut="actif",
            date_creation=datetime.now(timezone.utc),
        )
        
        db.add(admin)
        db.flush()
        
        db.commit()
        print("✅ Base de données initialisée avec succès !")
        print()
        print("Compte administrateur :")
        print("  Email:     admin@electricite.com")
        print("  Mot de passe: admin123")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors du seed : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
