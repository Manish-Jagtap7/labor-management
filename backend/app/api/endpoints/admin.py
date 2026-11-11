from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User, UserRole
from app.models.profile import ProviderProfile, CustomerProfile

router = APIRouter()

class RejectionPayload(BaseModel):
    rejection_reason: str

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(deps.get_db),
    admin_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """Get platform-wide statistics for the admin dashboard."""
    total_users = db.query(User).count()
    total_customers = db.query(User).filter(User.role == UserRole.customer).count()
    total_labours = db.query(ProviderProfile).count()
    pending_labours = db.query(ProviderProfile).filter(ProviderProfile.approval_status == "pending").count()
    approved_labours = db.query(ProviderProfile).filter(ProviderProfile.approval_status == "approved").count()
    rejected_labours = db.query(ProviderProfile).filter(ProviderProfile.approval_status == "rejected").count()

    return {
        "total_users": total_users,
        "total_customers": total_customers,
        "total_labours": total_labours,
        "pending_labours": pending_labours,
        "approved_labours": approved_labours,
        "rejected_labours": rejected_labours,
    }

@router.get("/labours")
def get_admin_labours(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(deps.get_db),
    admin_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """List all labour profiles with optional status filtering."""
    query = db.query(ProviderProfile)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(ProviderProfile.approval_status == status_filter.lower())

    profiles = query.order_by(ProviderProfile.id.desc()).all()
    results = []
    for p in profiles:
        user = p.user
        results.append({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name or (user.full_name if user else "Unknown"),
            "email": user.email if user else "No email",
            "is_active": user.is_active if user else True,
            "industry": p.industry,
            "skills": p.skills,
            "experience_years": p.experience_years,
            "location": p.location,
            "expected_wage": p.expected_wage,
            "is_available": p.is_available,
            "bio": p.bio,
            "image_url": p.image_url,
            "portfolio_urls": p.portfolio_urls,
            "aadhaar_card_url": p.aadhaar_card_url,
            "pan_card_url": p.pan_card_url,
            "approval_status": p.approval_status or "pending",
            "rejection_reason": p.rejection_reason,
        })
    return results

@router.put("/labours/{profile_id}/approve")
def approve_labour_profile(
    profile_id: int,
    db: Session = Depends(deps.get_db),
    admin_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """Approve a labour profile so they appear on the main page."""
    profile = db.query(ProviderProfile).filter(ProviderProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Labour profile not found")

    profile.approval_status = "approved"
    profile.rejection_reason = None
    db.commit()
    db.refresh(profile)

    return {
        "status": "success",
        "message": f"Profile for {profile.full_name or 'Labour'} has been approved successfully.",
        "profile_id": profile.id,
        "approval_status": profile.approval_status,
    }

@router.put("/labours/{profile_id}/reject")
def reject_labour_profile(
    profile_id: int,
    payload: RejectionPayload,
    db: Session = Depends(deps.get_db),
    admin_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """Reject a labour profile with an explanatory reason."""
    reason = payload.rejection_reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="A rejection reason must be provided")

    profile = db.query(ProviderProfile).filter(ProviderProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Labour profile not found")

    profile.approval_status = "rejected"
    profile.rejection_reason = reason
    db.commit()
    db.refresh(profile)

    return {
        "status": "success",
        "message": f"Profile for {profile.full_name or 'Labour'} has been rejected.",
        "profile_id": profile.id,
        "approval_status": profile.approval_status,
        "rejection_reason": profile.rejection_reason,
    }

@router.get("/customers")
def get_admin_customers(
    db: Session = Depends(deps.get_db),
    admin_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """List all registered customers and their profile information."""
    customer_users = db.query(User).filter(User.role == UserRole.customer).order_by(User.id.desc()).all()
    results = []
    for u in customer_users:
        cp = db.query(CustomerProfile).filter(CustomerProfile.user_id == u.id).first()
        results.append({
            "id": u.id,
            "full_name": u.full_name or "Customer",
            "email": u.email,
            "is_active": u.is_active,
            "company_name": cp.company_name if cp else None,
            "contact_phone": cp.contact_phone if cp else None,
            "location": cp.location if cp else None,
            "image_url": cp.image_url if cp else None,
        })
    return results

@router.put("/users/{user_id}/toggle-status")
def toggle_user_active_status(
    user_id: int,
    db: Session = Depends(deps.get_db),
    admin_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """Suspend or re-activate any user account on the platform."""
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Admins cannot disable their own account")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.is_active = not target_user.is_active
    db.commit()
    db.refresh(target_user)

    state = "activated" if target_user.is_active else "suspended"
    return {
        "status": "success",
        "message": f"User {target_user.email} has been {state}.",
        "user_id": target_user.id,
        "is_active": target_user.is_active,
    }
