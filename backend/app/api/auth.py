"""
Authentication endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.mot_de_passe):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    
    if user.statut != "actif":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre compte est désactivé. Contactez un administrateur.",
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )
