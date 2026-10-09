from sqlalchemy.orm import Session
from app.models.hiring import HiringRequest, RequestStatus
from app.schemas.hiring import HiringRequestCreate, HiringRequestStatusUpdate

def create_hiring_request(db: Session, request_in: HiringRequestCreate, customer_id: int):
    db_request = HiringRequest(
        customer_id=customer_id,
        provider_id=request_in.provider_id,
        profile_id=request_in.profile_id,
        job_description=request_in.job_description,
        date_needed=request_in.date_needed,
        proposed_wage=request_in.proposed_wage
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

def get_hiring_request(db: Session, request_id: int):
    return db.query(HiringRequest).filter(HiringRequest.id == request_id).first()

def get_requests_for_provider(db: Session, provider_id: int, skip: int = 0, limit: int = 20):
    return db.query(HiringRequest).filter(HiringRequest.provider_id == provider_id).order_by(HiringRequest.created_at.desc()).offset(skip).limit(limit).all()

def get_requests_for_customer(db: Session, customer_id: int, skip: int = 0, limit: int = 20):
    return db.query(HiringRequest).filter(HiringRequest.customer_id == customer_id).order_by(HiringRequest.created_at.desc()).offset(skip).limit(limit).all()

def update_request_status(db: Session, db_request: HiringRequest, status: RequestStatus):
    db_request.status = status
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request
