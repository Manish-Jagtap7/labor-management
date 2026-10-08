from sqlalchemy import Column, Integer, String, Boolean, Enum
import enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    customer = "customer"
    provider = "provider"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.customer)
    is_active = Column(Boolean(), default=True)
