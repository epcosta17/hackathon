import secrets
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from middleware.auth_middleware import get_current_user
from database import get_firestore_db
from pydantic import BaseModel


router = APIRouter(prefix="/v1/auth", tags=["authentication"])


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


# --- API Key Management ---

class APIKeyMetadata(BaseModel):
    """Metadata for an API key"""
    id: str
    prefix: str
    created_at: str
    last_used: str | None = None

@router.post("/api-keys")
async def generate_api_key(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Generate a new API key for the current user.
    The raw key is only returned ONCE.
    """
    # Generate random key
    raw_key = f"ivl_{secrets.token_urlsafe(32)}"
    hashed_key = hashlib.sha256(raw_key.encode()).hexdigest()
    
    db = get_firestore_db()
    now = datetime.utcnow().isoformat()
    
    key_doc = {
        "user_id": current_user['uid'],
        "email": current_user.get('email'),
        "prefix": raw_key[:8] + "...",
        "created_at": now,
        "updated_at": now
    }
    
    # Store hashed key as document ID
    db.collection('api_keys').document(hashed_key).set(key_doc)
    
    return {
        "api_key": raw_key,
        "message": "Store this key safely. It will not be shown again."
    }

@router.get("/api-keys", response_model=List[APIKeyMetadata])
async def list_api_keys(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List metadata for all active API keys for this user"""
    db = get_firestore_db()
    docs = db.collection('api_keys').where('user_id', '==', current_user['uid']).stream()
    
    keys = []
    for doc in docs:
        d = doc.to_dict()
        keys.append(APIKeyMetadata(
            id=doc.id,
            prefix=d.get('prefix', 'ivl_...'),
            created_at=d.get('created_at'),
            last_used=d.get('last_used')
        ))
    
    return sorted(keys, key=lambda x: x.created_at, reverse=True)

@router.delete("/api-keys/{key_hash}")
async def revoke_api_key(key_hash: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Revoke (delete) an API key"""
    db = get_firestore_db()
    doc_ref = db.collection('api_keys').document(key_hash)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Key not found")
    
    if doc.to_dict().get('user_id') != current_user['uid']:
        raise HTTPException(status_code=403, detail="Not authorized to revoke this key")
    
    doc_ref.delete()
    return {"status": "success", "message": "API key revoked"}

from fastapi.responses import HTMLResponse

action_router = APIRouter(prefix="/auth")

ACTION_HANDLER_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Action Handler</title>
    <style>
        body { background-color: #09090b; color: #e4e4e7; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #18181b; padding: 2rem; border-radius: 12px; border: 1px solid #27272a; text-align: center; max-width: 400px; width: 100%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        h2 { margin-top: 0; color: white; }
        p { color: #a1a1aa; }
        .loader { border: 3px solid #27272a; border-top: 3px solid #6366f1; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 1rem auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .hidden { display: none; }
        .btn { display: inline-block; background: #6366f1; color: white; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; margin-top: 1rem; font-weight: 500; }
        .error { color: #ef4444; }
    </style>
</head>
<body>
    <div class="card" id="card">
        <h2 id="title">Please wait...</h2>
        <div id="loader" class="loader"></div>
        <p id="message">Processing your request</p>
    </div>

    <!-- Firebase SDKs -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, applyActionCode, checkActionCode, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

        // Configuration
        const firebaseConfig = {
            apiKey: "AIzaSyC0VUqzNzebdlnQD8pkW8BkaPnKouPyAxY",
            authDomain: "interviewlens-32576.firebaseapp.com",
            projectId: "interviewlens-32576"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        // Parse Parameters
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const oobCode = params.get('oobCode');
        const apiKey = params.get('apiKey'); // Not needed if hardcoded

        const titleEl = document.getElementById('title');
        const msgEl = document.getElementById('message');
        const loaderEl = document.getElementById('loader');

        async function handleAction() {
            if (!mode || !oobCode) {
                showError("Invalid link. Missing query parameters.");
                return;
            }

            try {
                if (mode === 'verifyEmail') {
                    titleEl.innerText = "Verifying Email";
                    await applyActionCode(auth, oobCode);
                    
                    titleEl.innerText = "Email Verified!";
                    msgEl.innerText = "Redirecting you to the app...";
                    loaderEl.classList.add('hidden');
                    
                    // Redirect to App
                    setTimeout(() => {
                        window.location.href = "http://localhost:3000/?verified=true";
                    }, 1500);

                } else if (mode === 'resetPassword') {
                    // TODO: Implement password reset UI logic if needed
                    showError("Password reset not yet implemented in this custom handler.");
                } else {
                    showError("Unknown mode.");
                }
            } catch (error) {
                console.error(error);
                showError(error.message || "An error occurred.");
            }
        }

        function showError(msg) {
            titleEl.innerText = "Error";
            titleEl.classList.add('error');
            msgEl.innerText = msg;
            loaderEl.classList.add('hidden');
        }

        handleAction();
    </script>
</body>
</html>
"""

@action_router.get("/action", response_class=HTMLResponse)
async def auth_action_handler():
    """
    Serve the custom Firebase Action Handler page.
    This page uses the Firebase JS SDK to verify OOB codes.
    """
    return HTMLResponse(content=ACTION_HANDLER_TEMPLATE)
