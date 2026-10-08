from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_profile
from app.schemas.profile import ProviderProfileResponse

router = APIRouter()

@router.get("/providers", response_model=List[ProviderProfileResponse])
def search_labour_providers(
    db: Session = Depends(deps.get_db),
    industry: Optional[str] = Query(None, description="Filter by industry (e.g., Construction)"),
    location: Optional[str] = Query(None, description="Filter by city or location"),
    skills: Optional[str] = Query(None, description="Filter by specific skills (e.g., Mason)"),
    is_available: Optional[bool] = Query(None, description="Show only available workers"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> Any:
    """
    Search and filter for labour providers.
    Supports filtering by industry, location, skills, and availability.
    Includes pagination via skip and limit.
    """
    providers = crud_profile.search_providers(
        db=db,
        industry=industry,
        location=location,
        skills=skills,
        is_available=is_available,
        skip=skip,
        limit=limit
    )
    return providers
