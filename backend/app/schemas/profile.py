from pydantic import BaseModel, Field
from typing import Optional, Any
from app.schemas.user import UserResponse

# -- Provider Schemas --
class ProviderProfileBase(BaseModel):
    industry: str
    skills: str
    experience_years: int = Field(default=0, ge=0)
    location: str
    expected_wage: float = Field(gt=0)
    is_available: bool = True
    full_name: Optional[str] = None
    bio: Optional[str] = None
    image_url: Optional[str] = None
    portfolio_urls: Optional[str] = None

class ProviderProfileCreate(ProviderProfileBase):
    pass

class ProviderProfileUpdate(ProviderProfileBase):
    industry: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None
    expected_wage: Optional[float] = None
    is_available: Optional[bool] = None
    portfolio_urls: Optional[str] = None

class ProviderProfileResponse(ProviderProfileBase):
    id: int
    user_id: Optional[int] = None
    agency_id: Optional[int] = None
    user: Optional['UserResponse'] = None
    agency: Optional['UserResponse'] = None

    class Config:
        from_attributes = True

# -- Customer Schemas --
class CustomerProfileBase(BaseModel):
    company_name: Optional[str] = None
    contact_phone: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None

class CustomerProfileCreate(CustomerProfileBase):
    pass

class CustomerProfileUpdate(CustomerProfileBase):
    pass

class CustomerProfileResponse(CustomerProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
