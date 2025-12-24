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
from services.task_service import task_service

router = APIRouter(prefix="/v1", tags=["webhooks"])
logger = logging.getLogger(__name__)

load_dotenv()

async def run_full_analysis_pipeline(
    user_id: str,
    gcs_uri: str,
    content_type: str,
    original_filename: str,
    config: Dict[str, Any],
    webhook_url: str,
    webhook_secret: Optional[str] = None
):
    """
    Core pipeline logic: Transcription -> Analysis -> Save -> Webhook.
    Called by the Cloud Task worker endpoint.
    """
    temp_path = None
    credit_deducted = True # In Cloud Task flow, we already deducted it or we assume it is deducted
    
    try:
        # 1. Download from GCS to Temp for processing (duration/waveform/transcription)
        ext = os.path.splitext(original_filename)[1] or ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            temp_path = temp_file.name
            storage_service.download_file(gcs_uri, temp_path)
        
        # 2. Get Duration & Waveform
        duration = get_audio_duration(temp_path)
        waveform_data = generate_waveform_universal(temp_path)
        
        # 3. Transcribe
        # Deepgram signed URL for direct GCS access
        signed_url = storage_service.generate_signed_url(gcs_uri)
        transcript_blocks = await transcribe_with_deepgram(signed_url)
        
        # Formatted transcript for analysis
        formatted_transcript = []
        for block in transcript_blocks:
            ts = f"{int(block.timestamp // 60)}:{int(block.timestamp % 60):02d}"
            formatted_transcript.append(f"[{ts}] {block.text}")
        full_text_for_analysis = "\n".join(formatted_transcript)
        plain_text = " ".join([b.text for b in transcript_blocks])
        
        # 4. Analyze (Gemini)
        prompt_config = config.get("prompt_config")
        analysis_mode = config.get("analysis_mode", "fast")
        analysis_data = await asyncio.to_thread(
            generate_analysis_report,
            full_text_for_analysis,
            prompt_config,
            analysis_mode
        )
        
        # 5. Save to Firestore
        interview_id = int(time.time() * 1000)
        title = config.get("title", f"Interview-{interview_id}")
        
        # 5.1 Finalize Audio (Move from temp_audio/ to audio/)
        audio_filename = os.path.basename(gcs_uri)
        old_gcs_path = f"{user_id}/temp_audio/{audio_filename}"
        new_gcs_path = f"{user_id}/audio/{audio_filename}"
        
        logger.info(f"📦 [TASK] Finalizing audio: {old_gcs_path} -> {new_gcs_path}")
        storage_service.rename_file(old_gcs_path, new_gcs_path)
        
        audio_url = f"/v1/audio/{audio_filename}"

        save_full_interview_data(
            user_id=user_id,
            interview_id=interview_id,
            title=title,
            transcript_text=plain_text,
            transcript_words=[b.model_dump() for b in transcript_blocks] if hasattr(transcript_blocks[0], 'model_dump') else [b for b in transcript_blocks],
            analysis_data=analysis_data,
            audio_url=audio_url,
            audio_duration=duration,
            waveform_data=waveform_data
        )
        
        # 6. Notify Webhook
        frontend_url = os.getenv("FRONTEND_URL", "https://interviewlens-frontend-506249675300.us-central1.run.app").rstrip('/')
        api_url = os.getenv("API_URL", "https://interviewlens-api-506249675300.us-central1.run.app").rstrip('/')
        
        payload = {
            "analysis": analysis_data.model_dump() if hasattr(analysis_data, 'model_dump') else analysis_data,
            "deep_links": {
                "transcript": f"{frontend_url}/transcription/{interview_id}",
                "analysis": f"{frontend_url}/analysis/{interview_id}",
                "report": f"{api_url}/v1/interviews/{interview_id}/report"
            }
        }
        
        headers = {"Content-Type": "application/json"}
        if webhook_secret:
            timestamp = str(int(time.time()))
            payload_str = json.dumps(payload, separators=(',', ':'))
            signature_payload = f"{timestamp}.{payload_str}"
            signature = hmac.new(webhook_secret.encode(), signature_payload.encode(), hashlib.sha256).hexdigest()
            headers["X-Interview-Lens-Timestamp"] = timestamp
            headers["X-Interview-Lens-Signature"] = signature

        if webhook_url:
            async with httpx.AsyncClient() as client:
                await client.post(webhook_url, json=payload, headers=headers, timeout=30.0)
                logger.info(f"✅ [TASK] Notification successful for {user_id}")
        else:
            logger.warning(f"⚠️ [TASK] No webhook_url provided for user {user_id}, skipping success notification.")
            
    except Exception as e:
        logger.error(f"❌ [TASK] Pipeline failed: {str(e)}")
        # Handle refund if needed (simplified for Cloud Task)
        # Notify failure...
        if webhook_url:
            try:
                error_payload = {"status": "error", "error": str(e), "timestamp": int(time.time())}
                async with httpx.AsyncClient() as client:
                    await client.post(webhook_url, json=error_payload, timeout=10.0)
            except: pass
        else:
            logger.warning(f"⚠️ [TASK] No webhook_url provided for user {user_id}, skipping error notification.")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

@router.post("/tasks/process-audio")
async def process_audio_task(request: Dict[str, Any]):
    """
    Worker endpoint called by Cloud Tasks.
    """
    logger.info(f"👷 [WORKER] Received task for user: {request.get('user_id')}")
    
    # Run the pipeline
    # We don't use background_tasks here because Cloud Tasks expects the response 
    # only after the work is done (for retry logic). 
    # However, if it takes > 10 mins, we might need a different strategy or longer timeout.
    await run_full_analysis_pipeline(
        user_id=request['user_id'],
        gcs_uri=request['gcs_uri'],
        content_type=request['content_type'],
        original_filename=request['original_filename'],
        config=request['config'],
        webhook_url=request['webhook_url'],
        webhook_secret=request.get('webhook_secret')
    )
    
    return {"status": "completed"}

@router.post("/analyze-async")
async def analyze_async_endpoint(
    audio: UploadFile = File(...),
    config: str = Form(...),
    webhook_url: Optional[str] = Form(None),
    webhook_secret: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Unified asynchronous endpoint using Cloud Tasks for concurrency control.
    """
    try:
        config_dict = json.loads(config)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid config JSON")
    
    # 0. Basic Validation
    if webhook_url and not webhook_url.startswith("http"):
        raise HTTPException(status_code=400, detail="If provided, webhook_url must start with http/https")

    user_id = current_user['uid']
    db = get_firestore_db()
    user_ref = db.collection('users').document(user_id)
    
    # 1. Check & Deduct Credits
    if current_user.get("credits", 0) < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits.")
    
    # 2. Upload to GCS immediately (staging for worker)
    ext = os.path.splitext(audio.filename)[1] or ".mp3"
    remote_filename = f"{uuid.uuid4()}{ext}"
    gcs_path = f"{user_id}/temp_audio/{remote_filename}"
    
    storage_service.upload_file(gcs_path, audio.file, content_type=audio.content_type)
    logger.info(f"📤 [INGEST] Uploaded audio to {gcs_path}")

    # 3. Fetch default secret if missing
    if not webhook_secret:
        settings_doc = user_ref.collection('settings').document('analysis').get()
        if settings_doc.exists:
            webhook_secret = settings_doc.to_dict().get('webhook_secret')

    # 4. Deduct credit
    user_ref.update({"credits": firestore.Increment(-1)})

    # 5. Create Cloud Task
    try:
        task_service.create_analysis_task(
            user_id=user_id,
            gcs_uri=gcs_path,
            content_type=audio.content_type,
            original_filename=audio.filename,
            config=config_dict,
            webhook_url=webhook_url,
            webhook_secret=webhook_secret
        )
    except Exception as e:
        # Refund on failure to queue
        user_ref.update({"credits": firestore.Increment(1)})
        logger.error(f"Failed to queue task: {e}")
        raise HTTPException(status_code=500, detail="Failed to queue analysis task")

    return {
        "status": "processing",
        "message": "Task queued. Webhook will be notified upon completion."
    }
