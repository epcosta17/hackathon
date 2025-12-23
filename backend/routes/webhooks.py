import os
import json
import uuid
import time
import asyncio
import httpx
import tempfile
import logging
import hmac
import hashlib
from fastapi import APIRouter, File, Form, UploadFile, Depends, BackgroundTasks, HTTPException
from typing import Dict, Any, List, Optional
from models.schemas import TranscriptBlock
from middleware.auth_middleware import get_current_user
from services.transcription_service import transcribe_with_deepgram
from services.analysis_service import generate_analysis_report
from services.storage_service import storage_service
from services.waveform_service import get_audio_duration, generate_waveform_universal
from database import get_firestore_db, save_full_interview_data
from google.cloud import firestore
from dotenv import load_dotenv

router = APIRouter(prefix="/v1", tags=["webhooks"])
logger = logging.getLogger(__name__)

load_dotenv()

async def run_full_analysis_webhook_task(
    user_id: str,
    audio_content: bytes,
    content_type: str,
    original_filename: str,
    config: Dict[str, Any],
    webhook_url: str,
    webhook_secret: Optional[str] = None
):
    """
    Background worker that handles the full transcription, analysis, saving, and webhook notification.
    """
    temp_path = None
    credit_deducted = False
    
    try:
        db = get_firestore_db()
        user_ref = db.collection('users').document(user_id)
        
        # 1. Deduct Credits
        user_ref.update({"credits": firestore.Increment(-1)})
        credit_deducted = True
        logger.info(f"💰 [WEBHOOK] Deducted 1 credit for user {user_id}")
        
        # 2. Setup Temp File
        ext = os.path.splitext(original_filename)[1] or ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            temp_file.write(audio_content)
            temp_path = temp_file.name
        
        # 3. Get Duration & Waveform
        duration = get_audio_duration(temp_path)
        waveform_data = generate_waveform_universal(temp_path)
        
        # 4. Upload to GCS
        remote_filename = f"{uuid.uuid4()}{ext}"
        gcs_path = f"{user_id}/audio/{remote_filename}"
        with open(temp_path, "rb") as f:
            storage_service.upload_file(gcs_path, f, content_type=content_type)
        audio_url = f"/v1/audio/{remote_filename}"
        
        # 5. Transcribe
        # Deepgram signed URL for direct GCS access
        signed_url = storage_service.generate_signed_url(gcs_path)
        transcript_blocks = await transcribe_with_deepgram(signed_url)
        
        # Formatted transcript for analysis
        formatted_transcript = []
        for block in transcript_blocks:
            ts = f"{int(block.timestamp // 60)}:{int(block.timestamp % 60):02d}"
            formatted_transcript.append(f"[{ts}] {block.text}")
        full_text_for_analysis = "\n".join(formatted_transcript)
        plain_text = " ".join([b.text for b in transcript_blocks])
        
        # 6. Analyze
        prompt_config = config.get("prompt_config")
        analysis_mode = config.get("analysis_mode", "fast")
        analysis_data = await asyncio.to_thread(
            generate_analysis_report,
            full_text_for_analysis,
            prompt_config,
            analysis_mode
        )
        
        # 7. Save to Firestore
        interview_id = int(time.time() * 1000)
        title = config.get("title", f"Interview-{interview_id}")
        
        save_full_interview_data(
            user_id=user_id,
            interview_id=interview_id,
            title=title,
            transcript_text=plain_text,
            transcript_words=[b.model_dump() for b in transcript_blocks],
            analysis_data=analysis_data,
            audio_url=audio_url,
            audio_duration=duration,
            waveform_data=waveform_data
        )
        
        # 8. Generate Deep-links
        # Use defaults from production if env not set
        frontend_url = os.getenv("FRONTEND_URL", "https://interviewlens-frontend-506249675300.us-central1.run.app").rstrip('/')
        
        deep_links = {
            "transcript": f"{frontend_url}/transcription/{interview_id}",
            "analysis": f"{frontend_url}/analysis/{interview_id}"
        }
        
        # 9. Notify Webhook with consolidated payload
        payload = {
            "analysis": analysis_data.model_dump() if hasattr(analysis_data, 'model_dump') else analysis_data,
            "deep_links": deep_links
        }
        
        # 10. Prepare Headers & Signature
        headers = {"Content-Type": "application/json"}
        if webhook_secret:
            timestamp = str(int(time.time()))
            payload_str = json.dumps(payload, separators=(',', ':'))
            signature_payload = f"{timestamp}.{payload_str}"
            
            signature = hmac.new(
                webhook_secret.encode(),
                signature_payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            headers["X-Interview-Lens-Timestamp"] = timestamp
            headers["X-Interview-Lens-Signature"] = signature
            logger.info(f"🔒 [WEBHOOK] Payload signed with secret (prefix: {webhook_secret[:3]}...)")

        async with httpx.AsyncClient() as client:
            resp = await client.post(webhook_url, json=payload, headers=headers, timeout=30.0)
            resp.raise_for_status()
            logger.info(f"✅ [WEBHOOK] Notification successful: {webhook_url}")
            
    except Exception as e:
        logger.error(f"❌ [WEBHOOK] Background task failed: {str(e)}")
        
        # Refund credit if it was deducted
        if credit_deducted:
            try:
                user_ref.update({"credits": firestore.Increment(1)})
                logger.info(f"↩️ [WEBHOOK] Refunded 1 credit to user {user_id}")
            except Exception as refund_err:
                logger.error(f"Failed to refund credit: {refund_err}")
        
        # Notify webhook of failure if possible
        try:
            error_payload = {
                "status": "error",
                "error": str(e),
                "timestamp": int(time.time())
            }
            headers = {"Content-Type": "application/json"}
            if webhook_secret:
                timestamp = str(error_payload["timestamp"])
                payload_str = json.dumps(error_payload, separators=(',', ':'))
                signature_payload = f"{timestamp}.{payload_str}"
                signature = hmac.new(webhook_secret.encode(), signature_payload.encode(), hashlib.sha256).hexdigest()
                headers["X-Interview-Lens-Timestamp"] = timestamp
                headers["X-Interview-Lens-Signature"] = signature

            async with httpx.AsyncClient() as client:
                await client.post(webhook_url, json=error_payload, headers=headers, timeout=10.0)
        except Exception as notify_err:
            logger.error(f"Failed to send error notification to webhook: {notify_err}")
            
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass

@router.post("/analyze-async")
async def analyze_async_endpoint(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    config: str = Form(...),
    webhook_url: str = Form(...),
    webhook_secret: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Unified asynchronous endpoint. Returns immediate 202 and runs full pipeline in background,
    notifying the webhook_url upon completion.
    """
    try:
        config_dict = json.loads(config)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid config JSON")
    
    # Check credits immediately
    if current_user.get("credits", 0) < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits. 1 credit required.")
    
    # If secret not provided, try fetching from user settings
    if not webhook_secret:
        try:
            db = get_firestore_db()
            settings_doc = db.collection('users').document(current_user['uid']).collection('settings').document('analysis').get()
            if settings_doc.exists:
                webhook_secret = settings_doc.to_dict().get('webhook_secret')
        except Exception as e:
            logger.error(f"Failed to fetch default webhook secret: {e}")

    # Read audio content to memory for background task handling
    audio_content = await audio.read()
    
    background_tasks.add_task(
        run_full_analysis_webhook_task,
        user_id=current_user['uid'],
        audio_content=audio_content,
        content_type=audio.content_type,
        original_filename=audio.filename,
        config=config_dict,
        webhook_url=webhook_url,
        webhook_secret=webhook_secret
    )
    
    return {
        "status": "processing",
        "message": "Webhook will be notified upon completion"
    }
