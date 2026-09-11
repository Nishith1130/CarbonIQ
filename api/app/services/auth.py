from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Organization, User
from app.schemas.auth import TokenResponse, UserLoginRequest, UserRegisterRequest
from app.security import create_access_token, get_password_hash, verify_password


def register_user(db: Session, reg_data: UserRegisterRequest) -> TokenResponse:
    # Check if email is already registered
    existing_user = db.scalar(select(User).where(User.email == reg_data.email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # Hash password and create User
    hashed_password = get_password_hash(reg_data.password)
    user = User(
        email=reg_data.email,
        password_hash=hashed_password,
    )
    db.add(user)
    db.flush()  # populate user.id

    # Create primary Organization
    org = Organization(
        owner_user_id=user.id,
        name=reg_data.org_name,
        sector_id=reg_data.sector_id,
        turnover_inr=reg_data.turnover_inr,
        export_markets=reg_data.export_markets or [],
    )
    db.add(org)
    db.commit()
    db.refresh(user)
    db.refresh(org)

    # Issue JWT
    token_payload = {
        "sub": str(user.id),
        "org_id": str(org.id),
        "email": user.email,
        "sector_id": org.sector_id,
    }
    token = create_access_token(data=token_payload)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        org_id=org.id,
        email=user.email,
        org_name=org.name,
        sector_id=org.sector_id,
    )


def authenticate_user(db: Session, login_data: UserLoginRequest) -> TokenResponse:
    # Lookup user
    user = db.scalar(select(User).where(User.email == login_data.email))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Lookup primary organization
    org = db.scalar(select(Organization).where(Organization.owner_user_id == user.id))
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization profile found for this user.",
        )

    # Issue JWT
    token_payload = {
        "sub": str(user.id),
        "org_id": str(org.id),
        "email": user.email,
        "sector_id": org.sector_id,
    }
    token = create_access_token(data=token_payload)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        org_id=org.id,
        email=user.email,
        org_name=org.name,
        sector_id=org.sector_id,
    )
