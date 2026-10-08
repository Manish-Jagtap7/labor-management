from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_profile
from app.models.user import User, UserRole
from app.schemas.profile import (
    ProviderProfileCreate, ProviderProfileResponse, ProviderProfileUpdate,
    CustomerProfileCreate, CustomerProfileResponse, CustomerProfileUpdate
)

router = APIRouter()

# --- Provider Profile Endpoints ---

@router.post("/provider", response_model=ProviderProfileResponse)
def create_provider_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_in: ProviderProfileCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a profile for a labour provider."""
    if current_user.role != UserRole.provider:
        raise HTTPException(status_code=403, detail="Only providers can create a provider profile")
    
    existing_profile = crud_profile.get_provider_profile_by_user(db, user_id=current_user.id)
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already exists")
        
    return crud_profile.create_provider_profile(db=db, profile=profile_in, user_id=current_user.id)

@router.get("/provider/me", response_model=ProviderProfileResponse)
def get_my_provider_profile(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get current user's provider profile."""
    profile = crud_profile.get_provider_profile_by_user(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.get("/provider/{user_id}", response_model=ProviderProfileResponse)
def get_provider_profile(
    user_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Get a provider profile by user ID."""
    profile = crud_profile.get_provider_profile_by_user(db, user_id=user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.put("/provider/me", response_model=ProviderProfileResponse)
def update_my_provider_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_in: ProviderProfileUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update current user's provider profile."""
    profile = crud_profile.get_provider_profile_by_user(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return crud_profile.update_provider_profile(db=db, db_profile=profile, profile_in=profile_in)

# --- Customer Profile Endpoints ---

@router.post("/customer", response_model=CustomerProfileResponse)
def create_customer_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_in: CustomerProfileCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a profile for a customer."""
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can create a customer profile")
    
    existing_profile = crud_profile.get_customer_profile_by_user(db, user_id=current_user.id)
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already exists")
        
    return crud_profile.create_customer_profile(db=db, profile=profile_in, user_id=current_user.id)

@router.get("/customer/me", response_model=CustomerProfileResponse)
def get_my_customer_profile(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get current user's customer profile."""
    profile = crud_profile.get_customer_profile_by_user(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.put("/customer/me", response_model=CustomerProfileResponse)
def update_my_customer_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_in: CustomerProfileUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update current user's customer profile."""
    profile = crud_profile.get_customer_profile_by_user(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return crud_profile.update_customer_profile(db=db, db_profile=profile, profile_in=profile_in)
