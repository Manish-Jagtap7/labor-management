from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.hiring import RequestStatus
from app.schemas.user import UserResponse

class HiringRequestBase(BaseModel):
    provider_id: int
    job_description: str
    date_needed: str
    proposed_wage: float = Field(gt=0)

class HiringRequestCreate(HiringRequestBase):
    pass

class HiringRequestStatusUpdate(BaseModel):
    status: RequestStatus

class HiringRequestResponse(HiringRequestBase):
    id: int
    customer_id: int
    status: RequestStatus
    created_at: datetime
    customer: Optional['UserResponse'] = None
    provider: Optional['UserResponse'] = None

    class Config:
        from_attributes = True
