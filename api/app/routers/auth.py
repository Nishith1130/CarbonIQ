from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import User
from app.schemas.auth import (
    OrganizationResponse,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    reg_data: UserRegisterRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Register a new SME user and their organization, returning an initial JWT."""
    return register_user(db=db, reg_data=reg_data)


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: UserLoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Authenticate SME user credentials and issue a 24-hour Bearer JWT."""
    return authenticate_user(db=db, login_data=login_data)


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get profile and organization metadata for the currently authenticated user."""
    primary_org = current_user.organizations[0] if current_user.organizations else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at,
        organization=OrganizationResponse.model_validate(primary_org) if primary_org else None,
    )


@router.get("/whoami", response_model=UserResponse)
def get_whoami(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Alias for /auth/me."""
    return get_me(current_user=current_user)
