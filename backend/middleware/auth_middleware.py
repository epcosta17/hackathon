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
        uid = decoded_token.get('uid')
        
        # ---------------------------------------------------------
        # Email Verification Check
        # ---------------------------------------------------------
        if not decoded_token.get('email_verified', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. Please verify your email to access the platform.",
            )
        
        # ---------------------------------------------------------
        # Email Domain Whitelist (Prevent Custom Domain Abuse)
        # ---------------------------------------------------------
        ALLOWED_EMAIL_DOMAINS = {
            # Google
            'gmail.com', 'googlemail.com',
            # Microsoft
            'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
            # Yahoo
            'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.es',
            'yahoo.it', 'yahoo.com.br', 'yahoo.co.jp', 'yahoo.in',
            # ProtonMail
            'protonmail.com', 'proton.me', 'pm.me',
            # Apple
            'icloud.com', 'me.com', 'mac.com',
            # Other popular providers
            'aol.com', 'zoho.com', 'yandex.com', 'mail.com',
            'gmx.com', 'gmx.net', 'fastmail.com',
        }
        
        email = decoded_token.get('email', '').lower()
        if email:
            domain = email.split('@')[-1] if '@' in email else ''
            if domain not in ALLOWED_EMAIL_DOMAINS:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account creation is restricted to popular email providers. Domain '{domain}' is not allowed.",
                )
        
        # ---------------------------------------------------------
        # Sync with Firestore (Credit Initialization)
        # ---------------------------------------------------------
        from database import get_firestore_db
        from datetime import datetime
        
        db = get_firestore_db()
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        db_user_data = {}
        
        if not user_doc.exists:
            # New User: Initialize with 3 Free Credits
            print(f"🎉 New User Detected: {uid}. Assigning 3 Free Credits.")
            now = datetime.utcnow().isoformat()
            db_user_data = {
                'uid': uid,
                'email': decoded_token.get('email'),
                'credits': 3,  # FREE CREDITS
                'created_at': now,
                'updated_at': now
            }
            user_ref.set(db_user_data)
        else:
            # Existing User: Fetch latest credit balance
            db_user_data = user_doc.to_dict()
            
        # Merge DB data (credits) into the token payload
        # This makes current_user['credits'] available in all routes
        return {**decoded_token, **db_user_data}
        
    except Exception as e:
        print(f"Auth Error: {e}")
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
