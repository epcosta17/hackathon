"""Authentication middleware for protecting API endpoints"""
import hashlib
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
from services.auth_service import verify_firebase_token


# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get the current authenticated user from Firebase token or API Key
    
    Args:
        credentials: HTTP Authorization credentials (Bearer token)
        
    Returns:
        Decoded token or API key owner information merged with DB user data
        
    Raises:
        HTTPException: If token is invalid or verification fails
    """
    token = credentials.credentials
    decoded_token = {}
    uid = None
    
    try:
        if token.startswith("ey"):
            # ---------------------------------------------------------
            # Firebase ID Token
            # ---------------------------------------------------------
            decoded_token = await verify_firebase_token(token)
            uid = decoded_token.get('uid')
            
            # Email Verification Check
            if not decoded_token.get('email_verified', False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Email not verified. Please verify your email to access the platform.",
                )
            
            # Email Domain Whitelist (Skip for Google OAuth)
            sign_in_provider = decoded_token.get('firebase', {}).get('sign_in_provider', '')
            if sign_in_provider != 'google.com':
                ALLOWED_EMAIL_DOMAINS = {
                    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com',
                    'live.com', 'msn.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr',
                    'yahoo.de', 'yahoo.es', 'yahoo.it', 'yahoo.com.br', 'yahoo.co.jp',
                    'yahoo.in', 'protonmail.com', 'proton.me', 'pm.me', 'icloud.com',
                    'me.com', 'mac.com', 'aol.com', 'zoho.com', 'yandex.com',
                    'mail.com', 'gmx.com', 'gmx.net', 'fastmail.com',
                }
                email = decoded_token.get('email', '').lower()
                if email:
                    domain = email.split('@')[-1] if '@' in email else ''
                    if domain not in ALLOWED_EMAIL_DOMAINS:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Account creation is restricted to popular email providers. Domain '{domain}' is not allowed.",
                        )
        
        elif token.startswith("ivl_"):
            # ---------------------------------------------------------
            # Custom API Key (ivl_...)
            # ---------------------------------------------------------
            from database import get_firestore_db
            db = get_firestore_db()
            
            # Hash the key using SHA-256
            hashed_key = hashlib.sha256(token.encode()).hexdigest()
            
            # Look up in api_keys collection
            key_doc = db.collection('api_keys').document(hashed_key).get()
            if not key_doc.exists:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API Key",
                )
            
            key_data = key_doc.to_dict()
            uid = key_data.get('user_id')
            
            if not uid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API Key has no associated user",
                )
            
            # Mock the decoded_token structure for downstream consistency
            decoded_token = {
                'uid': uid,
                'email': key_data.get('email', 'api-key-user@example.com'),
                'email_verified': True,
                'firebase': {'sign_in_provider': 'api_key'}
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format. Must be a Firebase ID Token or an 'ivl_' API key.",
            )

        # ---------------------------------------------------------
        # Sync with Firestore (Credit Initialization / Fetch)
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
            
            # Initialize Default Analysis Settings
            from services.prompt_blocks import DEFAULT_BLOCK_ORDER
            settings_ref = db.collection('users').document(uid).collection('settings').document('analysis')
            settings_ref.set({
                'enabled_blocks': DEFAULT_BLOCK_ORDER,
                'model_mode': 'fast',
                'updated_at': now
            })
            print(f"✅ Initialized default analysis settings for user {uid}")
        else:
            # Existing User: Fetch latest credit balance
            db_user_data = user_doc.to_dict()
            
        # Merge DB data (credits) into the token payload
        return {**decoded_token, **db_user_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication dependency - returns user if authenticated, None otherwise
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except Exception:
        return None
