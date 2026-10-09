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
    """Create a profile for a labour provider or an agency worker."""
    if current_user.role not in [UserRole.provider, UserRole.agency]:
        raise HTTPException(status_code=403, detail="Only providers or agencies can create a worker profile")
    
    if current_user.role == UserRole.provider:
        existing_profile = crud_profile.get_provider_profile_by_user(db, user_id=current_user.id)
        if existing_profile:
            raise HTTPException(status_code=400, detail="Profile already exists")
        return crud_profile.create_provider_profile(db=db, profile=profile_in, user_id=current_user.id)
    else:
        # Agency creating a new worker profile
        if not profile_in.full_name:
            raise HTTPException(status_code=400, detail="full_name is required for agency workers")
        return crud_profile.create_provider_profile(db=db, profile=profile_in, agency_id=current_user.id)

@router.get("/provider/me", response_model=ProviderProfileResponse)
def get_my_provider_profile(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get current user's provider profile."""
    if current_user.role != UserRole.provider:
        raise HTTPException(status_code=403, detail="Only individual providers have a singular profile")
    profile = crud_profile.get_provider_profile_by_user(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

from typing import List
@router.get("/provider/agency/workers", response_model=List[ProviderProfileResponse])
def get_agency_workers(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get all workers managed by the current agency."""
    if current_user.role != UserRole.agency:
        raise HTTPException(status_code=403, detail="Only agencies can access this endpoint")
    return crud_profile.get_provider_profiles_by_agency(db, agency_id=current_user.id)

@router.get("/provider/profile/{profile_id}", response_model=ProviderProfileResponse)
def get_provider_profile(
    profile_id: int,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Get a provider profile by profile ID."""
    from app.models.profile import ProviderProfile
    profile = db.query(ProviderProfile).filter(ProviderProfile.id == profile_id).first()
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

@router.put("/provider/agency/worker/{profile_id}", response_model=ProviderProfileResponse)
def update_agency_worker_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_id: int,
    profile_in: ProviderProfileUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update an agency worker's profile."""
    if current_user.role != UserRole.agency:
        raise HTTPException(status_code=403, detail="Only agencies can update worker profiles")
    
    from app.models.profile import ProviderProfile
    profile = db.query(ProviderProfile).filter(ProviderProfile.id == profile_id, ProviderProfile.agency_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile not found or not managed by you")
    return crud_profile.update_provider_profile(db=db, db_profile=profile, profile_in=profile_in)

# --- Customer Profile Endpoints ---

@router.post("/customer", response_model=CustomerProfileResponse)
def create_customer_profile(
    *,
    db: Session = Depends(deps.get_db),
    profile_in: CustomerProfileCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a profile for a customer or agency."""
    if current_user.role not in [UserRole.customer, UserRole.agency]:
        raise HTTPException(status_code=403, detail="Only customers or agencies can create this profile")
    
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
