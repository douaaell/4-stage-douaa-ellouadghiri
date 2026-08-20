"""
Database seed script — creates sample data for demonstration.
"""
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.database.database import SessionLocal, init_db
from app.models.user import User
from app.models.document import Document
from app.models.conversation import Conversation, Message
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
        
        print("Création des données de démonstration...")
        
        # ─── Users ────────────────────────────────────────
        admin = User(
            nom="Admin Principal",
            email="admin@electricite.com",
            mot_de_passe=get_password_hash("admin123"),
            role="administrateur",
            statut="actif",
            date_creation=datetime.now(timezone.utc) - timedelta(days=90),
        )
        
        tech1 = User(
            nom="Ahmed Benali",
            email="ahmed.benali@electricite.com",
            mot_de_passe=get_password_hash("tech123"),
            role="technicien",
            statut="actif",
            date_creation=datetime.now(timezone.utc) - timedelta(days=60),
        )
        
        tech2 = User(
            nom="Fatima Zahra",
            email="fatima.zahra@electricite.com",
            mot_de_passe=get_password_hash("tech123"),
            role="technicien",
            statut="actif",
            date_creation=datetime.now(timezone.utc) - timedelta(days=45),
        )
        
        tech3 = User(
            nom="Karim Idrissi",
            email="karim.idrissi@electricite.com",
            mot_de_passe=get_password_hash("tech123"),
            role="technicien",
            statut="inactif",
            date_creation=datetime.now(timezone.utc) - timedelta(days=30),
        )
        
        db.add_all([admin, tech1, tech2, tech3])
        db.flush()
        
        # ─── Documents ───────────────────────────────────
        documents = [
            Document(
                nom="Guide Installation Disjoncteur Différentiel",
                chemin="documents/uploads/guide_disjoncteur.pdf",
                categorie="Installation",
                description="Guide complet d'installation des disjoncteurs différentiels 30 mA et 300 mA",
                taille=2450000,
                statut="indexé",
                date_import=datetime.now(timezone.utc) - timedelta(days=30),
            ),
            Document(
                nom="Norme NF C 15-100",
                chemin="documents/uploads/norme_nf_c_15_100.pdf",
                categorie="Normes",
                description="Norme française pour les installations électriques basse tension",
                taille=5200000,
                statut="indexé",
                date_import=datetime.now(timezone.utc) - timedelta(days=25),
            ),
            Document(
                nom="Manuel Schneider Electric - Tableau Électrique",
                chemin="documents/uploads/manuel_schneider.pdf",
                categorie="Fabricant",
                description="Documentation technique Schneider Electric pour les tableaux de distribution",
                taille=3800000,
                statut="indexé",
                date_import=datetime.now(timezone.utc) - timedelta(days=20),
            ),
            Document(
                nom="Guide Câblage Nexans",
                chemin="documents/uploads/guide_nexans.pdf",
                categorie="Fabricant",
                description="Guide de sélection et d'installation des câbles Nexans",
                taille=1900000,
                statut="indexé",
                date_import=datetime.now(timezone.utc) - timedelta(days=15),
            ),
            Document(
                nom="Procédure de Maintenance Préventive",
                chemin="documents/uploads/maintenance_preventive.pdf",
                categorie="Maintenance",
                description="Procédures standard de maintenance préventive des installations électriques",
                taille=1200000,
                statut="indexé",
                date_import=datetime.now(timezone.utc) - timedelta(days=10),
            ),
            Document(
                nom="Guide Dépannage Legrand",
                chemin="documents/uploads/depannage_legrand.pdf",
                categorie="Dépannage",
                description="Guide de dépannage pour les équipements Legrand",
                taille=2800000,
                statut="indexé",
                date_import=datetime.now(timezone.utc) - timedelta(days=5),
            ),
        ]
        db.add_all(documents)
        
        # ─── Conversations & Messages ────────────────────
        # Conversation 1 — Ahmed
        conv1 = Conversation(
            user_id=tech1.id,
            titre="Comment installer un disjoncteur différentiel 30 mA ?",
            date_creation=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db.add(conv1)
        db.flush()
        
        msg1 = Message(
            conversation_id=conv1.id,
            question="Comment installer un disjoncteur différentiel 30 mA ?",
            reponse=(
                "## Installation d'un disjoncteur différentiel 30 mA\n\n"
                "Pour installer un disjoncteur différentiel 30 mA, suivez ces étapes :\n\n"
                "### 1. Préparation\n"
                "- **Coupez l'alimentation générale** au niveau du disjoncteur principal\n"
                "- Vérifiez l'absence de tension avec un VAT\n\n"
                "### 2. Câblage\n"
                "1. Raccordez les fils d'alimentation sur les bornes amont\n"
                "2. Raccordez les fils de sortie sur les bornes aval\n"
                "3. Respectez le code couleur\n\n"
                "### 3. Vérification\n"
                "- Testez le bouton test du différentiel"
            ),
            sources=json.dumps([
                {"titre": "Guide_Installation_Disjoncteur.pdf", "page": 12, "extrait": "Procédure d'installation..."},
                {"titre": "Norme_NF_C_15_100.pdf", "page": 34, "extrait": "Protection différentielle obligatoire..."},
            ], ensure_ascii=False),
            date=datetime.now(timezone.utc) - timedelta(days=2),
        )
        
        msg1b = Message(
            conversation_id=conv1.id,
            question="Quel type de tournevis utiliser pour le serrage ?",
            reponse=(
                "## Outillage recommandé\n\n"
                "Pour le serrage des bornes d'un disjoncteur différentiel :\n\n"
                "- **Tournevis plat isolé** (1000V) de taille adaptée aux vis des bornes\n"
                "- **Couple de serrage** : 2,5 N.m pour les bornes standard\n"
                "- Utilisez toujours des **outils isolés** conformes à la norme IEC 60900"
            ),
            sources=json.dumps([
                {"titre": "Manuel_Schneider_Electric.pdf", "page": 15, "extrait": "Couples de serrage recommandés..."},
            ], ensure_ascii=False),
            date=datetime.now(timezone.utc) - timedelta(days=2, hours=-1),
        )
        db.add_all([msg1, msg1b])
        
        # Conversation 2 — Ahmed
        conv2 = Conversation(
            user_id=tech1.id,
            titre="Quelle section de câble utiliser pour un four électrique ?",
            date_creation=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(conv2)
        db.flush()
        
        msg2 = Message(
            conversation_id=conv2.id,
            question="Quelle section de câble utiliser pour un four électrique ?",
            reponse=(
                "## Section de câble pour un four électrique\n\n"
                "Selon la **norme NF C 15-100** :\n\n"
                "- **Section minimale** : 2,5 mm²\n"
                "- **Protection** : disjoncteur 20A\n"
                "- **Circuit dédié** obligatoire\n\n"
                "Le four doit être raccordé sur un circuit spécialisé avec une prise 20A ou une sortie de câble."
            ),
            sources=json.dumps([
                {"titre": "Norme_NF_C_15_100.pdf", "page": 45, "extrait": "Tableau des sections de câbles..."},
                {"titre": "Guide_Cables_Nexans.pdf", "page": 22, "extrait": "Sections recommandées..."},
            ], ensure_ascii=False),
            date=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(msg2)
        
        # Conversation 3 — Fatima
        conv3 = Conversation(
            user_id=tech2.id,
            titre="Comment câbler un interrupteur va-et-vient ?",
            date_creation=datetime.now(timezone.utc) - timedelta(days=3),
        )
        db.add(conv3)
        db.flush()
        
        msg3 = Message(
            conversation_id=conv3.id,
            question="Comment câbler un interrupteur va-et-vient ?",
            reponse=(
                "## Câblage d'un interrupteur va-et-vient\n\n"
                "Le va-et-vient permet de commander un même point lumineux depuis deux endroits différents.\n\n"
                "### Schéma de principe\n"
                "1. La **phase** arrive sur la borne L du premier interrupteur\n"
                "2. Les bornes **navettes** (1 et 2) relient les deux interrupteurs\n"
                "3. La borne **L du deuxième interrupteur** part vers la lampe\n"
                "4. Le **neutre** va directement à la lampe\n\n"
                "### Câbles nécessaires\n"
                "- Section **1,5 mm²** pour l'éclairage\n"
                "- Protection par disjoncteur **10A**"
            ),
            sources=json.dumps([
                {"titre": "Guide_Installation_Disjoncteur.pdf", "page": 28, "extrait": "Schéma va-et-vient..."},
                {"titre": "Guide_Depannage_Legrand.pdf", "page": 15, "extrait": "Câblage interrupteurs..."},
            ], ensure_ascii=False),
            date=datetime.now(timezone.utc) - timedelta(days=3),
        )
        db.add(msg3)
        
        db.commit()
        print("✅ Données de démonstration créées avec succès !")
        print()
        print("Comptes disponibles :")
        print("  Admin:      admin@electricite.com / admin123")
        print("  Technicien: ahmed.benali@electricite.com / tech123")
        print("  Technicien: fatima.zahra@electricite.com / tech123")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors du seed : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
