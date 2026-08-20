"""
Application configuration loaded from environment variables.
"""
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "CSELEC assistant"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    
    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = "sqlite:///./assistant_ia.db"
    
    # ChromaDB
    CHROMA_PATH: str = "./chroma"
    
    # Documents storage
    DOCUMENTS_PATH: str = "./documents/uploads"
    
    # LLM Configuration
    LLM_PROVIDER: str = "ollama"  # "ollama" or "openai"
    
    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # RAG
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 5

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
