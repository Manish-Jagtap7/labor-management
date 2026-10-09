from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.core.database import Base

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class HiringRequest(Base):
    __tablename__ = "hiring_requests"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Refers to the User (Individual or Agency)
    profile_id = Column(Integer, ForeignKey("provider_profiles.id"), nullable=True) # Refers to the specific labour profile
    
    job_description = Column(String, nullable=False)
    date_needed = Column(String, nullable=False) # Simplified as string for this MVP
    proposed_wage = Column(Float, nullable=False)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], backref="outgoing_requests")
    provider = relationship("User", foreign_keys=[provider_id], backref="incoming_requests")
