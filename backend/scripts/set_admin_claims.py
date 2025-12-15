import argparse
import firebase_admin
from firebase_admin import auth, credentials
import os
import sys

# Setup: Ensure you have GOOGLE_APPLICATION_CREDENTIALS set or are logged in
# to a service account that has permission to manage users.

def set_admin_claim(email: str, is_admin: bool):
    try:
        # Initialize Firebase if not already
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
            
        # Get user by email
        user = auth.get_user_by_email(email)
        
        # Set custom claims
        # We preserve existing claims if any, and just update 'admin'
        current_claims = user.custom_claims or {}
        
        if is_admin:
            current_claims['admin'] = True
        else:
            if 'admin' in current_claims:
                del current_claims['admin']
                
        auth.set_custom_user_claims(user.uid, current_claims)
        
        status = "GRANTED" if is_admin else "REVOKED"
        print(f"✅ Admin custom claim {status} for {email} (UID: {user.uid})")
        print("NOTE: The user must sign out and sign back in for the token to refresh with new claims.")
        
    except firebase_admin.auth.UserNotFoundError:
        print(f"❌ User with email '{email}' not found.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Set or unset admin custom claim for a user.")
    parser.add_argument("email", help="User's email address")
    parser.add_argument("--revoke", action="store_true", help="Revoke admin privileges")
    
    args = parser.parse_args()
    
    set_admin_claim(args.email, not args.revoke)
