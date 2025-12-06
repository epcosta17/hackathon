import os
import stripe
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from database import get_firestore_db
from middleware.auth_middleware import get_current_user
from typing import Dict, Any

router = APIRouter()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

# Pricing Configuration (Simple MVP)
CREDIT_PACKS = {
    "pack_5": {"credits": 5, "price_cents": 500, "name": "5 Interview Credits"},
    "pack_20": {"credits": 20, "price_cents": 1500, "name": "20 Interview Credits (Best Value)"}
}

@router.post("/create-checkout-session")
async def create_checkout_session(
    data: Dict[str, str], 
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a Stripe Checkout Session for buying credits"""
    pack_id = data.get("pack_id", "pack_5")
    pack = CREDIT_PACKS.get(pack_id)
    
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid credit pack")

    try:
        domain_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': pack['name'],
                            'description': 'AI Analysis Credits',
                        },
                        'unit_amount': pack['price_cents'],
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=domain_url + '/dashboard?success=true',
            cancel_url=domain_url + '/dashboard?canceled=true',
            metadata={
                "user_id": current_user['uid'],
                "credits": pack['credits'],
                "pack_id": pack_id
            }
        )
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe Webhooks to fulfill orders"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        await fulfilling_order(session)

    return JSONResponse(content={"status": "success"})

async def fulfilling_order(session):
    """Add credits to the user's account"""
    user_id = session.get("metadata", {}).get("user_id")
    credits_to_add = int(session.get("metadata", {}).get("credits", 0))
    
    if not user_id or credits_to_add <= 0:
        print(f"⚠️ [BILLING] Invalid metadata in session: {session.get('id')}")
        return

    print(f"💰 [BILLING] Adding {credits_to_add} credits to user {user_id}")
    
    db = get_firestore_db()
    user_ref = db.collection('users').document(user_id)
    
    # Atomic Increment
    # Note: Using google-cloud-firestore syntax for increment
    from google.cloud import firestore
    user_ref.update({
        "credits": firestore.Increment(credits_to_add)
    })
    print(f"✅ [BILLING] Credits added successfully for {user_id}")
