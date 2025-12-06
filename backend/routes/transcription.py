
import json
import asyncio
import tempfile
import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException, Request, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse, Response
from pathlib import Path
from typing import Dict, Any
import os
import time

router = APIRouter(prefix="/api", tags=["transcription"])

# Import transcription functions from service
from services.transcription_service import transcribe_with_whisper_cpp, transcribe_with_deepgram, generate_mock_transcript
from services.storage_service import storage_service
from middleware.auth_middleware import get_current_user, verify_firebase_token


@router.post("/transcribe")
async def transcribe_endpoint(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    token: str = None, 
    request: Request = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Handles audio file upload and transcription (Standard JSON response).
    import logging
    logger = logging.getLogger(__name__)

    if audio_file.content_type not in ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only MP3 and WAV supported.")
    
    file_content = await audio_file.read()
    file_extension = ".mp3" if "mp3" in audio_file.content_type else ".wav"
    
    # Extract user_id for outer scope usage (cleanup task)
    user_id = current_user['uid']
    
    temp_file = None
    try:
        # 0. Setup File & GCS Paths (Common for all methods)
        raw_filename = audio_file.filename or "audio.mp3"
        ext_from_file = os.path.splitext(raw_filename)[1]
        ext = ext_from_file if ext_from_file else file_extension
        
        # Create Temp File
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        temp_file.write(file_content)
        temp_file.close()
        
        # Define Waveform Task (Run in parallel but don't await yet)
        from services.waveform_service import generate_waveform_universal
        
        # Helper to run waveform generation safely in thread
        def run_waveform_gen():
            try:
                return generate_waveform_universal(temp_file.name, samples=275)
            except Exception as ex:
                logger.error(f"Waveform generation failed: {ex}")
                return []

        # Launch waveform generation immediately in background thread
        # CRITICAL FIX: asyncio.to_thread returns a coroutine. It MUST be wrapped in create_task
        # to actually start running in the background before we await it later.
        waveform_task = asyncio.create_task(asyncio.to_thread(run_waveform_gen))
        logger.info("Launched background waveform generation task...")

        # Setup GCS Path
        remote_filename = f"{uuid.uuid4()}{ext}"
        gcs_path = f"{user_id}/temp_audio/{remote_filename}"  # Store in temp first
        audio_url = f"/api/audio/temp/{remote_filename}"      # New temp URL format
        
        # Priority: Deepgram API > whisper.cpp (FREE!) > WhisperX Local > OpenAI API > Mock Data
        deepgram_key = os.getenv("DEEPGRAM_API_KEY")
        
        if deepgram_key:
            logger.info("Starting Parallel Deepgram + GCS Upload...")
            
            # Define upload wrapper
            async def upload_audio_to_gcs():
                if not os.path.exists(temp_file.name):
                        logger.error("Temp file missing for upload")
                        return None
                
                logger.info(f"Starting background upload to {gcs_path}")
                from services.storage_service import storage_service
                
                # We need to open a NEW file handle for reading
                with open(temp_file.name, 'rb') as f_up:
                        await asyncio.to_thread(storage_service.upload_file, gcs_path, f_up, content_type=audio_file.content_type)
                
                logger.info(f"Background upload complete: {audio_url}")
                return audio_url

            # 1. GCS Upload
            uploaded_url = await upload_audio_to_gcs()
            
            # Generate a signed URL for Deepgram
            from services.storage_service import storage_service
            
            try:
                signed_url = storage_service.generate_signed_url(gcs_path)
                source_for_deepgram = signed_url
                logger.info("Generated GCS Signed URL for Deepgram")
            except Exception as e:
                logger.warning(f"Could not generate signed URL (likely ADC limitation): {e}")
                logger.info("Falling back to direct file upload to Deepgram")
                source_for_deepgram = temp_file.name
            
            # 2. Deepgram Transcription
            transcript_blocks = await transcribe_with_deepgram(source_for_deepgram)
            
            logger.info(f"Parallel tasks complete! Blocks: {len(transcript_blocks)}, URL: {uploaded_url}")

        elif os.path.exists("/opt/homebrew/bin/whisper-cli"):
            # Inline Upload (Legacy)
            from services.storage_service import storage_service
            with open(temp_file.name, 'rb') as f_up:
                    storage_service.upload_file(gcs_path, f_up, content_type=audio_file.content_type)
            audio_url = f"/api/audio/temp/{remote_filename}"

            logger.info(f"Starting whisper-cli transcription for: {temp_file.name}")
            progress_queue = asyncio.Queue() # Not really used in non-streaming but cleaner to keep logic
            transcript_blocks = await transcribe_with_whisper_cpp(temp_file.name, progress_queue)

        else:
            # Mock path
            transcript_blocks = generate_mock_transcript()

        # Retrieve Waveform (Should be done by now)
        logger.info("Retrieving waveform data...")
        waveform_data = await waveform_task
        
        logger.info(f"Preparing final response with {len(transcript_blocks)} blocks...")
        # Serialization fix: Convert Pydantic models to dicts
        transcript_data = [block.model_dump() for block in transcript_blocks]
        
        return {
            'transcript': transcript_data, 
            'waveform': waveform_data, 
            'audio_url': audio_url
        }
        
    except Exception as e:
        logger.error(f"ERROR in transcription: {str(e)}")
        import traceback
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except:
                pass
    
    # Trigger cleanup of old temp files
    background_tasks.add_task(storage_service.cleanup_temp_files, user_id=user_id)



@router.get("/audio/temp/{audio_filename}")
@router.head("/audio/temp/{audio_filename}")
async def get_temp_audio_file(
    audio_filename: str,
    request: Request,
    token: str = None
):
    """Serve a TEMPORARY audio file from temp_audio/ folder."""
    # Logic mirrors get_audio_file but points to temp_audio
    user_id = None
    try:
        # 1. Check Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            id_token = auth_header.split("Bearer ")[1]
            decoded = await verify_firebase_token(id_token)
            user_id = decoded['uid']
        # 2. Check Query Parameter
        elif token:
            decoded = await verify_firebase_token(token)
            user_id = decoded['uid']
        else:
            raise HTTPException(status_code=403, detail="Not authenticated")
            
        from services.storage_service import storage_service
        gcs_path = f"{user_id}/temp_audio/{audio_filename}"

        try:
            signed_url = storage_service.generate_signed_url(gcs_path)
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=signed_url)
        except Exception as e:
            # Fallback
            def iterfile_gcs():
                with storage_service.open_file_stream(gcs_path) as stream:
                    chunk_size = 8192 * 4
                    while True:
                        data = stream.read(chunk_size)
                        if not data: break
                        yield data
            return StreamingResponse(iterfile_gcs(), media_type="audio/mpeg")

    except Exception as e:
        print(f"Failed to serve temp audio: {e}")
        raise HTTPException(status_code=404, detail="Temp audio not found")

@router.get("/audio/{audio_filename}")
@router.head("/audio/{audio_filename}")
async def get_audio_file(
    audio_filename: str,
    request: Request,
    token: str = None
):
    """
    Serve an audio file using GCS Signed URLs.
    Redirects the browser directly to GCS for optimal performance and native seeking.
    """
    # Manual authentication check to support both Header and Query Param
    user_id = None
    try:
        # 1. Check Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            id_token = auth_header.split("Bearer ")[1]
            decoded = await verify_firebase_token(id_token)
            user_id = decoded['uid']
        # 2. Check Query Parameter
        elif token:
            decoded = await verify_firebase_token(token)
            user_id = decoded['uid']
        else:
            raise HTTPException(status_code=403, detail="Not authenticated")
    except Exception as e:
        print(f"Auth failed for audio stream: {str(e)}")
        raise HTTPException(status_code=403, detail="Authentication failed")

    try:
        from services.storage_service import storage_service
        
        # Use user-scoped path
        gcs_path = f"{user_id}/audio/{audio_filename}"

        # Generate Signed URL and Redirect
        # This allows the browser to stream directly from GCS with native performance
        # and support for Range requests, seeking, etc.
        try:
            signed_url = storage_service.generate_signed_url(gcs_path)
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=signed_url)
        except Exception as e:
            # Expected in local dev without service account key
            print(f"⚠️ [GCS] Signed URL generation failed (using fallback): {e}")
            # Fallback to streaming through backend if signing fails
            def iterfile_gcs():
                with storage_service.open_file_stream(gcs_path) as stream:
                    chunk_size = 8192 * 4
                    while True:
                        data = stream.read(chunk_size)
                        if not data: break
                        yield data
            
            return StreamingResponse(iterfile_gcs(), media_type="audio/mpeg")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve audio file: {str(e)}")
