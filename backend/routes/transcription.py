
import json
import asyncio
import tempfile
import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException, Request, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse, Response
from pathlib import Path
from typing import Dict, Any
import os

router = APIRouter(prefix="/api", tags=["transcription"])

# Import transcription functions from service
from services.transcription_service import transcribe_with_whisper_cpp, transcribe_with_deepgram, generate_mock_transcript
from services.storage_service import storage_service
from middleware.auth_middleware import get_current_user, verify_firebase_token


@router.post("/transcribe-stream")
async def transcribe_stream_endpoint(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    token: str = None, 
    request: Request = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Handles audio file upload and streams progress updates via Server-Sent Events.
    """
    if audio_file.content_type not in ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only MP3 and WAV supported.")
    
    file_content = await audio_file.read()
    file_extension = ".mp3" if "mp3" in audio_file.content_type else ".wav"
    
    # Extract user_id for outer scope usage (cleanup task)
    user_id = current_user['uid']
    
    async def event_generator():
        temp_file = None
        try:
            yield f"data: {json.dumps({'progress': 5, 'message': 'Uploading file...'})}\n\n"
            await asyncio.sleep(0.1)

            # 0. Setup File & GCS Paths (Common for all methods)
            # user_id is now available from outer scope
            raw_filename = audio_file.filename or "audio.mp3"
            # Prefer extension from filename, else fallback to content-type guess
            ext_from_file = os.path.splitext(raw_filename)[1]
            ext = ext_from_file if ext_from_file else file_extension
            
            # Create Temp File
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
            temp_file.write(file_content)
            temp_file.close()
            
            # Setup GCS Path
            remote_filename = f"{uuid.uuid4()}{ext}"
            gcs_path = f"{user_id}/temp_audio/{remote_filename}"  # Store in temp first
            audio_url = f"/api/audio/temp/{remote_filename}"      # New temp URL format
            # Priority: Deepgram API > whisper.cpp (FREE!) > WhisperX Local > OpenAI API > Mock Data
            deepgram_key = os.getenv("DEEPGRAM_API_KEY")
            
            if deepgram_key:
                print(f"🚀 [BACKEND] Starting Parallel Deepgram + GCS Upload...")
                yield f"data: {json.dumps({'progress': 10, 'message': 'Starting parallel processing...'})}\n\n"
                
                # Define upload wrapper
                async def upload_audio_to_gcs():
                    # Check if file exists in temp before opening
                    if not os.path.exists(temp_file.name):
                         print("❌ [BACKEND] Temp file missing for upload")
                         return None
                    
                    print(f"🚀 [BACKEND] Starting background upload to {gcs_path}")
                    from services.storage_service import storage_service
                    
                    # We need to open a NEW file handle for reading, as temp_file was written and closed
                    with open(temp_file.name, 'rb') as f_up:
                         # Run in thread pool to avoid blocking event loop
                         await asyncio.to_thread(storage_service.upload_file, gcs_path, f_up, content_type=audio_file.content_type)
                    
                    print(f"✅ [BACKEND] Background upload complete: {audio_url}")
                    return audio_url

                # Create tasks
                # 1. Deepgram Transcription
                deepgram_task = asyncio.create_task(transcribe_with_deepgram(temp_file.name))
                
                # 2. GCS Upload
                upload_task = asyncio.create_task(upload_audio_to_gcs())
                
                # Wait for both (Deepgram is usually slower, so upload hides behind it)
                yield f"data: {json.dumps({'progress': 20, 'message': 'Transcribing & Uploading parallelly...'})}\n\n"
                
                # We can await them together
                results = await asyncio.gather(deepgram_task, upload_task)
                transcript_blocks = results[0]
                uploaded_url = results[1]
                
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"
                print(f"🎉 [BACKEND] Parallel tasks complete! Blocks: {len(transcript_blocks)}, URL: {uploaded_url}")

            elif os.path.exists("/opt/homebrew/bin/whisper-cli"):
                # (Keep existing whisper logic, but maybe add upload task here too if needed later)
                # For now focusing on Deepgram optimization as requested
                
                # ... standard whisper logic ...
                # For consistency, we should do the upload here too, but serially for now or copy logic
                # Let's just do inline upload for whisper path to keep it simple for now as it wasn't the focus
                
                # Inline Upload (Legacy for Whisper)
                from services.storage_service import storage_service
                with open(temp_file.name, 'rb') as f_up:
                     storage_service.upload_file(gcs_path, f_up, content_type=audio_file.content_type)
                
                print(f"🚀 [BACKEND] Starting whisper-cli transcription for: {temp_file.name}")
                yield f"data: {json.dumps({'progress': 10, 'message': 'Transcribing with whisper.cpp (FREE!)...'})}\n\n"
                
                progress_queue = asyncio.Queue()
                transcription_task = asyncio.create_task(
                    transcribe_with_whisper_cpp(temp_file.name, progress_queue)
                )
                
                last_progress = 10
                while not transcription_task.done():
                    try:
                        progress_pct, message = await asyncio.wait_for(
                            progress_queue.get(),
                            timeout=0.5
                        )
                        if progress_pct > last_progress:
                            last_progress = progress_pct
                            yield f"data: {json.dumps({'progress': progress_pct, 'message': message})}\n\n"
                    except asyncio.TimeoutError:
                        pass
                
                transcript_blocks = await transcription_task
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"

            else:
                # Mock path
                transcript_blocks = generate_mock_transcript()

            # Generate waveform visualization
            print(f"🎵 [BACKEND] Generating waveform visualization...")
            yield f"data: {json.dumps({'progress': 92, 'message': 'Generating waveform...'})}\n\n"
            await asyncio.sleep(0.1)
            
            from services.waveform_service import generate_waveform_universal
            waveform_data = generate_waveform_universal(temp_file.name, samples=275)
            
            print(f"📦 [BACKEND] Preparing final response with {len(transcript_blocks)} blocks...")
            # Serialization fix: Convert Pydantic models to dicts
            transcript_data = [block.model_dump() for block in transcript_blocks]
            
            yield f"data: {json.dumps({'progress': 100, 'message': 'Complete', 'transcript': transcript_data, 'waveform': waveform_data, 'audio_url': audio_url})}\n\n"
            
        except Exception as e:
            print(f"💥 [BACKEND] ERROR in transcription: {str(e)}")
            import traceback
            print(f"📍 [BACKEND] Traceback:\n{traceback.format_exc()}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except:
                    pass
    
    # Trigger cleanup of old temp files for this user (garbage collection)
    # This ensures abandoned files from previous sessions are removed when user returns.
    background_tasks.add_task(storage_service.cleanup_temp_files, user_id=user_id)

    return StreamingResponse(event_generator(), media_type="text/event-stream")



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
