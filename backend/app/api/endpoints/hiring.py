from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_hiring, crud_user
from app.models.user import User, UserRole
from app.schemas.hiring import HiringRequestCreate, HiringRequestResponse, HiringRequestStatusUpdate

router = APIRouter()

@router.post("/request", response_model=HiringRequestResponse)
def create_request(
    *,
    db: Session = Depends(deps.get_db),
    request_in: HiringRequestCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Customer sends a new hiring request to a Provider."""
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Only customers can send hiring requests.")
    
    # Check if provider exists and is actually a provider
    provider = crud_user.get_user(db, user_id=request_in.provider_id)
    if not provider or provider.role != UserRole.provider:
        raise HTTPException(status_code=404, detail="Labour provider not found or invalid user type.")
        
    # Check for existing pending or accepted request to same provider
    from app.models.hiring import HiringRequest, RequestStatus
    existing = db.query(HiringRequest).filter(
        HiringRequest.customer_id == current_user.id,
        HiringRequest.provider_id == request_in.provider_id,
        HiringRequest.status.in_([RequestStatus.PENDING, RequestStatus.ACCEPTED])
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active request with this worker.")
        
    return crud_hiring.create_hiring_request(db=db, request_in=request_in, customer_id=current_user.id)

@router.get("/customer/my-requests", response_model=List[HiringRequestResponse])
def get_customer_requests(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 20,
) -> Any:
    """Customer views all requests they have sent."""
    if current_user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return crud_hiring.get_requests_for_customer(db, customer_id=current_user.id, skip=skip, limit=limit)

@router.get("/provider/incoming-requests", response_model=List[HiringRequestResponse])
def get_provider_requests(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 20,
) -> Any:
    """Provider views all incoming hiring requests."""
    if current_user.role != UserRole.provider:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return crud_hiring.get_requests_for_provider(db, provider_id=current_user.id, skip=skip, limit=limit)

@router.put("/provider/requests/{request_id}/status", response_model=HiringRequestResponse)
def update_request_status(
    *,
    db: Session = Depends(deps.get_db),
    request_id: int,
    status_update: HiringRequestStatusUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Provider accepts, declines, or marks a request as completed."""
    if current_user.role != UserRole.provider:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    db_request = crud_hiring.get_hiring_request(db, request_id=request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found.")
        
    if db_request.provider_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only manage your own incoming requests.")
        
    return crud_hiring.update_request_status(db=db, db_request=db_request, status=status_update.status)
