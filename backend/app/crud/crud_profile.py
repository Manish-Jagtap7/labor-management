from typing import Optional
from sqlalchemy.orm import Session
from app.models.profile import ProviderProfile, CustomerProfile
from app.schemas.profile import ProviderProfileCreate, ProviderProfileUpdate, CustomerProfileCreate, CustomerProfileUpdate

# --- Provider Profile CRUD ---
def get_provider_profile_by_user(db: Session, user_id: int):
    return db.query(ProviderProfile).filter(ProviderProfile.user_id == user_id).first()

def create_provider_profile(db: Session, profile: ProviderProfileCreate, user_id: Optional[int] = None, agency_id: Optional[int] = None):
    db_profile = ProviderProfile(**profile.model_dump(), user_id=user_id, agency_id=agency_id)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def get_provider_profiles_by_agency(db: Session, agency_id: int):
    return db.query(ProviderProfile).filter(ProviderProfile.agency_id == agency_id).all()

def update_provider_profile(db: Session, db_profile: ProviderProfile, profile_in: ProviderProfileUpdate):
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_profile, field, value)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

# --- Customer Profile CRUD ---
def get_customer_profile_by_user(db: Session, user_id: int):
    return db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).first()

def create_customer_profile(db: Session, profile: CustomerProfileCreate, user_id: int):
    db_profile = CustomerProfile(**profile.model_dump(), user_id=user_id)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_customer_profile(db: Session, db_profile: CustomerProfile, profile_in: CustomerProfileUpdate):
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_profile, field, value)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

# --- Search & Filtering ---
def search_providers(
    db: Session,
    industry: Optional[str] = None,
    location: Optional[str] = None,
    skills: Optional[str] = None,
    is_available: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20
):
    query = db.query(ProviderProfile)
    
    if industry:
        query = query.filter(ProviderProfile.industry.ilike(f"%{industry}%"))
    if location:
        query = query.filter(ProviderProfile.location.ilike(f"%{location}%"))
    if skills:
        query = query.filter(ProviderProfile.skills.ilike(f"%{skills}%"))
    if is_available is not None:
        query = query.filter(ProviderProfile.is_available == is_available)
        
    # Sort by lowest wage by default
    query = query.order_by(ProviderProfile.expected_wage.asc())
    
    return query.offset(skip).limit(limit).all()
