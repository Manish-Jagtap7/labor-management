from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.chat import Message
from app.schemas.chat import MessageResponse
from typing import Dict, List, Any
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, request_id: int):
        await websocket.accept()
        if request_id not in self.active_connections:
            self.active_connections[request_id] = []
        self.active_connections[request_id].append(websocket)

    def disconnect(self, websocket: WebSocket, request_id: int):
        if request_id in self.active_connections:
            self.active_connections[request_id].remove(websocket)
            if not self.active_connections[request_id]:
                del self.active_connections[request_id]

    async def broadcast_to_room(self, message: str, request_id: int):
        if request_id in self.active_connections:
            for connection in self.active_connections[request_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/{request_id}")
async def websocket_endpoint(websocket: WebSocket, request_id: int, token: str, db: Session = Depends(deps.get_db)):
    user = await deps.get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await manager.connect(websocket, request_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Save to DB
            new_msg = Message(request_id=request_id, sender_id=user.id, content=data)
            db.add(new_msg)
            db.commit()
            
            # Broadcast
            payload = json.dumps({
                "id": new_msg.id,
                "request_id": request_id,
                "sender_id": user.id,
                "content": data,
                "sender_name": user.full_name,
                "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None
            })
            await manager.broadcast_to_room(payload, request_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, request_id)

@router.get("/history/{request_id}", response_model=List[MessageResponse])
def get_chat_history(request_id: int, db: Session = Depends(deps.get_db), current_user: Any = Depends(deps.get_current_user)):
    msgs = db.query(Message).filter(Message.request_id == request_id).order_by(Message.created_at).all()
    # Add sender_name for frontend convenience
    for msg in msgs:
        sender = db.query(deps.User).filter(deps.User.id == msg.sender_id).first()
        msg.sender_name = sender.full_name if sender else "Unknown"
    return msgs

@router.put("/history/{request_id}/read")
def mark_chat_read(request_id: int, db: Session = Depends(deps.get_db), current_user: Any = Depends(deps.get_current_user)):
    # Mark messages as read where current_user is NOT the sender
    msgs = db.query(Message).filter(Message.request_id == request_id, Message.sender_id != current_user.id, Message.is_read == 0).all()
    for msg in msgs:
        msg.is_read = 1
    db.commit()
    return {"status": "success"}

@router.get("/unread-count")
def get_unread_count(db: Session = Depends(deps.get_db), current_user: Any = Depends(deps.get_current_user)):
    from app.models.hiring import HiringRequest
    # Find all requests where user is either customer or provider
    requests = db.query(HiringRequest).filter(
        (HiringRequest.customer_id == current_user.id) | (HiringRequest.provider_id == current_user.id)
    ).all()
    request_ids = [req.id for req in requests]
    if not request_ids:
        return {"unread_count": 0}
    
    # Count unread messages in these requests where sender != current user
    count = db.query(Message).filter(
        Message.request_id.in_(request_ids),
        Message.sender_id != current_user.id,
        Message.is_read == 0
    ).count()
    return {"unread_count": count}
