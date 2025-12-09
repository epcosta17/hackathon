import os
import stripe
import requests
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from database import get_firestore_db
from middleware.auth_middleware import get_current_user
from typing import Dict, Any
from datetime import datetime, timedelta

router = APIRouter(prefix="/v1/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

# Pricing Configuration (Simple MVP)
CREDIT_PACKS = {
    "pack_5": {"credits": 5, "price_cents": 500, "name": "5 Interview Credits"},
    "pack_20": {"credits": 20, "price_cents": 1500, "name": "20 Interview Credits (Best Value)"}
}

# Fallback Exchange Rates (if API fails)
FALLBACK_EXCHANGE_RATES = {
    "usd": 1.0,
    "eur": 0.92,
    "gbp": 0.79,
    "cad": 1.36,
    "inr": 84.50,
    "aud": 1.52,
    "jpy": 150.0,
    "cny": 7.25,
    "mxn": 20.0
}

# Cache for exchange rates (1 hour)
EXCHANGE_RATES_CACHE = {
    "rates": None,
    "last_updated": None
}

def get_exchange_rates() -> Dict[str, float]:
    """Fetch real-time exchange rates from API with caching and fallback"""
    # Check cache (1 hour TTL)
    if (EXCHANGE_RATES_CACHE["rates"] and 
        EXCHANGE_RATES_CACHE["last_updated"] and
        datetime.now() - EXCHANGE_RATES_CACHE["last_updated"] < timedelta(hours=1)):
        return EXCHANGE_RATES_CACHE["rates"]
    
    try:
        # Fetch from ExchangeRate-API (free, no API key needed)
        response = requests.get("https://api.exchangerate-api.com/v4/latest/USD", timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Extract rates we support
        rates = {
            "usd": 1.0,
            "eur": data["rates"].get("EUR", FALLBACK_EXCHANGE_RATES["eur"]),
            "gbp": data["rates"].get("GBP", FALLBACK_EXCHANGE_RATES["gbp"]),
            "cad": data["rates"].get("CAD", FALLBACK_EXCHANGE_RATES["cad"]),
            "inr": data["rates"].get("INR", FALLBACK_EXCHANGE_RATES["inr"]),
            "aud": data["rates"].get("AUD", FALLBACK_EXCHANGE_RATES["aud"]),
            "jpy": data["rates"].get("JPY", FALLBACK_EXCHANGE_RATES["jpy"]),
            "cny": data["rates"].get("CNY", FALLBACK_EXCHANGE_RATES["cny"]),
            "mxn": data["rates"].get("MXN", FALLBACK_EXCHANGE_RATES["mxn"])
        }
        
        # Update cache
        EXCHANGE_RATES_CACHE["rates"] = rates
        EXCHANGE_RATES_CACHE["last_updated"] = datetime.now()
        
        print(f"✅ [BILLING] Exchange rates updated from API")
        return rates
        
    except Exception as e:
        print(f"⚠️ [BILLING] Failed to fetch exchange rates from API: {e}")
        print(f"ℹ️ [BILLING] Using fallback exchange rates")
        return FALLBACK_EXCHANGE_RATES

@router.post("/create-payment-intent")
async def create_payment_intent(
    data: Dict[str, str], 
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a Stripe PaymentIntent for buying credits (Elements Flow)"""
    pack_id = data.get("pack_id", "pack_5")
    currency = data.get("currency", "usd").lower()
    
    pack = CREDIT_PACKS.get(pack_id)
    
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid credit pack")

    # Get current exchange rates (cached or from API)
    exchange_rates = get_exchange_rates()
    
    if currency not in exchange_rates:
        # Fallback to USD if unsupported
        currency = "usd"

    try:
        # Calculate amount in target currency
        # Base price in cents (USD) * Rate
        # Note: JPY is zero-decimal currency, but Stripe API handles 'amount' as smallest unit. 
        # For JPY 1000 yen -> 1000. For USD 10.00 -> 1000.
        # This simple logic might need refinement for zero-decimal currencies but works for standard 2-decimal.
        
        base_price_cents = pack['price_cents']
        rate = exchange_rates.get(currency, 1.0)
        
        # Stripe expects integer amounts
        final_amount = int(base_price_cents * rate)
        
        # Special case for zero-decimal currencies like JPY
        if currency in ['jpy', 'krw', 'vnd']:
            # 500 cents = $5.00 -> * 150 = 750 (750 Yen).
            # But Stripe 'amount' for JPY is just integer Yen.
            # So 500 cents / 100 = $5 * 150 = 750 Yen. 
            # Our formula 'cents * rate' does: 500 * 150 = 75000 (which would be 75000 Yen = $500).
            # So we need to adjustments:
            final_amount = int((base_price_cents / 100.0) * rate)

        # Create a PaymentIntent with the order amount and currency
        intent = stripe.PaymentIntent.create(
            amount=final_amount,
            currency=currency,
            automatic_payment_methods={
                'enabled': True,
            },
            metadata={
                "user_id": current_user['uid'],
                "credits": pack['credits'],
                "pack_id": pack_id,
                "currency": currency,
                "original_price_usd": pack['price_cents']
            }
        )
        return {"clientSecret": intent.client_secret}
    except Exception as e:
        print(f"❌ [BILLING] Create Intent Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exchange-rates")
async def get_current_exchange_rates():
    """Get current exchange rates for frontend display"""
    try:
        rates = get_exchange_rates()
        return {"rates": rates, "base": "USD"}
    except Exception as e:
        print(f"❌ [BILLING] Exchange Rates Error: {e}")
        return {"rates": FALLBACK_EXCHANGE_RATES, "base": "USD"}

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
