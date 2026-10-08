from pydantic import BaseModel
from datetime import datetime

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    request_id: int

class MessageResponse(MessageBase):
    id: int
    request_id: int
    sender_id: int
    created_at: datetime
    is_read: int | None = 0
    sender_name: str | None = None

    class Config:
        from_attributes = True
