"""Authentication middleware for protecting API endpoints"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
from services.auth_service import verify_firebase_token


# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get the current authenticated user from Firebase token
    
    Args:
        credentials: HTTP Authorization credentials (Bearer token)
        
    Returns:
        Decoded token containing user information
        
    Raises:
        HTTPException: If token is invalid or verification fails
    """
    token = credentials.credentials
    
    try:
        # Verify the Firebase ID token
        decoded_token = await verify_firebase_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
) -> Dict[str, Any] | None:
    """
    Optional authentication dependency - returns user if authenticated, None otherwise
    Useful for endpoints that work for both authenticated and unauthenticated users
    
    Args:
        credentials: HTTP Authorization credentials (Bearer token), optional
        
    Returns:
        Decoded token containing user information, or None if not authenticated
    """
    if credentials is None:
        return None
    
    try:
        decoded_token = await verify_firebase_token(credentials.credentials)
        return decoded_token
    except Exception:
        return None
