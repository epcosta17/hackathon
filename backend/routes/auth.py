"""Authentication routes for Firebase token verification and user management"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from middleware.auth_middleware import get_current_user
from pydantic import BaseModel


router = APIRouter(prefix="/api/auth", tags=["authentication"])


class VerifyTokenResponse(BaseModel):
    """Response model for token verification"""
    uid: str
    email: str | None
    email_verified: bool | None
    name: str | None
    picture: str | None


@router.get("/verify", response_model=VerifyTokenResponse)
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Verify the Firebase ID token and return user information
    This endpoint is useful for debugging and checking token validity
    
    Returns:
        User information from the decoded token
    """
    return VerifyTokenResponse(
        uid=current_user.get("uid"),
        email=current_user.get("email"),
        email_verified=current_user.get("email_verified"),
        name=current_user.get("name"),
        picture=current_user.get("picture"),
    )


@router.get("/me")
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current authenticated user information
    
    Returns:
        Complete user information from the decoded token
    """
    return {
        "uid": current_user.get("uid"),
        "email": current_user.get("email"),
        "email_verified": current_user.get("email_verified"),
        "name": current_user.get("name"),
        "picture": current_user.get("picture"),
        "auth_time": current_user.get("auth_time"),
        "iss": current_user.get("iss"),
        "aud": current_user.get("aud"),
        "exp": current_user.get("exp"),
        "iat": current_user.get("iat"),
    }
