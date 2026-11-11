from fastapi import APIRouter
from app.api.endpoints import auth, profiles, search, hiring, chat, upload, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(hiring.router, prefix="/hiring", tags=["hiring"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
