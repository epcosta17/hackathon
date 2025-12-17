from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth_middleware import get_current_user
from database import get_firestore_db
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from google.cloud import firestore

router = APIRouter(prefix="/v1/admin", tags=["admin"])

def verify_admin(current_user: Dict[str, Any] = Depends(get_current_user)):
    # Check for 'admin' custom claim in the token
    if current_user.get("admin") is True:
        return current_user
    # Log access attempt
    print(f"⚠️ Admin access denied for: {current_user.get('email')} (UID: {current_user.get('uid')})")
    raise HTTPException(status_code=403, detail="Admin access required")

class UserAdminView(BaseModel):
    uid: str
    email: Optional[str] = None
    credits: float = 0
    interview_count: int = 0
    created_at: Optional[str] = None
    last_login: Optional[str] = None

class AdminStats(BaseModel):
    total_users: int
    total_credits: int
    total_interviews: int

class AddCreditsRequest(BaseModel):
    amount: int

@router.get("/users", response_model=List[UserAdminView])
async def list_users(current_user: Dict[str, Any] = Depends(verify_admin)):
    """List all users for admin view"""
    db = get_firestore_db()
    
    # Fetch users
    # Note: Firebase Admin SDK doesn't easily support "list all users" with custom claims/fields 
    # via Auth efficiently without pagination, but for DB documents it is fine.
    # We will query the 'users' collection.
    
    users_ref = db.collection('users')
    docs = users_ref.stream()
    
    users = []
    for doc in docs:
        data = doc.to_dict()
        
        # Get interview count (subcollection)
        # Using stream/len is acceptable for hackathon scale (N+1 queries)
        try:
            interviews_ref = users_ref.document(doc.id).collection('interviews')
            # Use aggregation if available, otherwise stream
            interview_count = len(list(interviews_ref.stream()))
        except Exception:
            interview_count = 0

        users.append(UserAdminView(
            uid=doc.id,
            email=data.get('email'),
            credits=data.get('credits', 0),
            interview_count=interview_count,
            created_at=str(data.get('created_at', '')),
            last_login=str(data.get('updated_at', '')) # approximating last login
        ))
    
    return users

@router.post("/users/{uid}/credits")
async def add_credits(
    uid: str, 
    request: AddCreditsRequest,
    current_user: Dict[str, Any] = Depends(verify_admin)
):
    """Add credits to a specific user"""
    db = get_firestore_db()
    user_ref = db.collection('users').document(uid)
    
    doc = user_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_ref.update({
        "credits": firestore.Increment(request.amount)
    })
    
    # Get updated balance
    updated_doc = user_ref.get()
    new_credits = updated_doc.get('credits')
    
    return {"message": "Credits added", "new_balance": new_credits}

@router.get("/stats", response_model=AdminStats)
async def get_stats(current_user: Dict[str, Any] = Depends(verify_admin)):
    """Get global statistics"""
    db = get_firestore_db()
    
    # This might be slow if there are millions of users, but fine for hackathon
    users = list(db.collection('users').stream())
    total_users = len(users)
    total_credits = sum(u.to_dict().get('credits', 0) for u in users)
    
    # Count total interviews by iterating (expensive) or use aggregation query
    # Aggregation is better but might require newer SDK. 
    # Let's simple iterate subcollections for now or just skip it if too slow.
    # Actually, let's just count total users and credits for now.
    # I'll try to do a naive count of interviews if possible, otherwise 0.
    
    total_interviews = 0
    # Optimizing: doing this properly requires Collection Group query
    # 'users/{uid}/interviews'
    # Collection Group 'interviews'
    # Check if index exists for this, otherwise it requires creating one.
    # To be safe, I'll try aggregation query if available, or just skip it.
    
    try:
        # Collection Group Query
        interviews_query = db.collection_group('interviews')
        
        # Simple streaming count (reliable for hackathon scale)
        # Note: In production, consider aggregation queries or maintaining a counter
        interviews = list(interviews_query.stream())
        total_interviews = len(interviews)
        
    except Exception as e:
        print(f"Stats error (interviews): {e}")
        
    return AdminStats(
        total_users=total_users,
        total_credits=total_credits,
        total_interviews=total_interviews 
    )
