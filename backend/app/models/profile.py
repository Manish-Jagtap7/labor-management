from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProviderProfile(Base):
    __tablename__ = "provider_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    industry = Column(String, index=True, nullable=False) # e.g., Construction, Agriculture
    skills = Column(String, nullable=False) # e.g., "Mason, Carpenter"
    experience_years = Column(Integer, default=0)
    location = Column(String, index=True, nullable=False)
    expected_wage = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True)
    bio = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    portfolio_urls = Column(Text, nullable=True) # comma separated image urls

    user = relationship("User", backref="provider_profile")

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    company_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    image_url = Column(Text, nullable=True)

    user = relationship("User", backref="customer_profile")
