import os
import stripe
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from database import get_firestore_db
from middleware.auth_middleware import get_current_user
from typing import Dict, Any

router = APIRouter(prefix="/v1/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

# Pricing Configuration (Simple MVP)
CREDIT_PACKS = {
    "pack_5": {"credits": 5, "price_cents": 500, "name": "5 Interview Credits"},
    "pack_20": {"credits": 20, "price_cents": 1500, "name": "20 Interview Credits (Best Value)"}
}

@router.post("/create-payment-intent")
async def create_payment_intent(
    data: Dict[str, str], 
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a Stripe PaymentIntent for buying credits (Elements Flow)"""
    pack_id = data.get("pack_id", "pack_5")
    pack = CREDIT_PACKS.get(pack_id)
    
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid credit pack")

    try:
        # Create a PaymentIntent with the order amount and currency
        intent = stripe.PaymentIntent.create(
            amount=pack['price_cents'],
            currency='usd',
            automatic_payment_methods={
                'enabled': True,
            },
            metadata={
                "user_id": current_user['uid'],
                "credits": pack['credits'],
                "pack_id": pack_id
            }
        )
        return {"clientSecret": intent.client_secret}
    except Exception as e:
        print(f"❌ [BILLING] Create Intent Error: {e}")
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
        print(f"❌ [BILLING] Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        print(f"❌ [BILLING] Invalid signature: {e}")
        print(f"ℹ️ [BILLING] Secret used: {endpoint_secret[:5]}..." if endpoint_secret else "ℹ️ [BILLING] No Secret Found")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print(f"❌ [BILLING] Webhook Error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        await fulfilling_order(payment_intent)
    elif event['type'] == 'checkout.session.completed':
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
