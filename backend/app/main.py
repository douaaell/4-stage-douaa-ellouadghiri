"""
FastAPI application entry point.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import init_db
from app.database.seed import seed_database
from app.api import auth, users, documents, conversations, chat, stats

# Create upload directory
os.makedirs(settings.DOCUMENTS_PATH, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="API pour CSELEC assistant",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """Initialize database and seed data on startup."""
    init_db()
    seed_database()


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.OLLAMA_MODEL if settings.LLM_PROVIDER == "ollama" else settings.OPENAI_MODEL,
    }

