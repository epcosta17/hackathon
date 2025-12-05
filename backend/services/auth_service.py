"""Firebase Authentication Service"""
import os
import firebase_admin
from firebase_admin import credentials, auth
from typing import Optional, Dict, Any


# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials"""
    try:
        # Check if already initialized
        firebase_admin.get_app()
        print("✅ Firebase Admin SDK already initialized")
    except ValueError:
        # Not initialized yet, initialize now
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        if not cred_path:
            raise ValueError("FIREBASE_CREDENTIALS environment variable not set")
        
        # Check if path is absolute or relative to backend directory
        if not os.path.isabs(cred_path):
            # Assume it's relative to the backend directory
            backend_dir = os.path.dirname(os.path.dirname(__file__))
            cred_path = os.path.join(backend_dir, cred_path)
        
        if not os.path.exists(cred_path):
            raise FileNotFoundError(f"Firebase credentials file not found: {cred_path}")
        
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK initialized successfully")


async def verify_firebase_token(id_token: str) -> Dict[str, Any]:
    """
    Verify Firebase ID token and return decoded token with user info
    
    Args:
        id_token: Firebase ID token from the client
        
    Returns:
        Decoded token containing user information (uid, email, etc.)
        
    Raises:
        auth.InvalidIdTokenError: If token is invalid
        auth.ExpiredIdTokenError: If token has expired
        auth.RevokedIdTokenError: If token has been revoked
        Exception: For other verification errors
    """
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.InvalidIdTokenError as e:
        raise Exception(f"Invalid Firebase token: {str(e)}")
    except auth.ExpiredIdTokenError as e:
        raise Exception(f"Expired Firebase token: {str(e)}")
    except auth.RevokedIdTokenError as e:
        raise Exception(f"Revoked Firebase token: {str(e)}")
    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")


async def get_user_by_uid(uid: str) -> Optional[auth.UserRecord]:
    """
    Get user information by UID
    
    Args:
        uid: Firebase user UID
        
    Returns:
        UserRecord object or None if user not found
    """
    try:
        user = auth.get_user(uid)
        return user
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        print(f"Error fetching user: {str(e)}")
        return None


async def get_user_by_email(email: str) -> Optional[auth.UserRecord]:
    """
    Get user information by email
    
    Args:
        email: User's email address
        
    Returns:
        UserRecord object or None if user not found
    """
    try:
        user = auth.get_user_by_email(email)
        return user
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        print(f"Error fetching user: {str(e)}")
        return None
