"""Transcription-related API routes."""
import os
import json
import asyncio
import tempfile
from fastapi import APIRouter, File, UploadFile, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, Response
from pathlib import Path
from typing import Dict, Any

router = APIRouter(prefix="/api", tags=["transcription"])

# Import transcription functions from service
from services.transcription_service import transcribe_with_whisper_cpp, transcribe_with_deepgram, generate_mock_transcript
from middleware.auth_middleware import get_current_user, verify_firebase_token


@router.post("/transcribe-stream")
async def transcribe_stream_endpoint(
    audio_file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Handles audio file upload and streams progress updates via Server-Sent Events.
    """
    if audio_file.content_type not in ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only MP3 and WAV supported.")
    
    file_content = await audio_file.read()
    file_extension = ".mp3" if "mp3" in audio_file.content_type else ".wav"
    
    async def event_generator():
        temp_file = None
        try:
            yield f"data: {json.dumps({'progress': 5, 'message': 'Uploading file...'})}\n\n"
            await asyncio.sleep(0.1)
            
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
            temp_file.write(file_content)
            temp_file.close()
            
            # Priority: Deepgram API > whisper.cpp (FREE!) > WhisperX Local > OpenAI API > Mock Data
            deepgram_key = os.getenv("DEEPGRAM_API_KEY")
            
            if deepgram_key:
                print(f"🚀 [BACKEND] Starting Deepgram transcription for: {temp_file.name}")
                yield f"data: {json.dumps({'progress': 10, 'message': 'Transcribing with Deepgram AI...'})}\n\n"
                await asyncio.sleep(0.1)
                
                # Deepgram is fast, so we don't have granular progress updates like whisper.cpp
                # But we can simulate some progress while waiting
                yield f"data: {json.dumps({'progress': 30, 'message': 'Analyzing audio with Nova-2...'})}\n\n"
                
                print("⚙️  [BACKEND] Creating Deepgram task...")
                # Deepgram is usually very fast (seconds)
                transcript_blocks = await transcribe_with_deepgram(temp_file.name)
                
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"
                print(f"🎉 [BACKEND] Deepgram complete! Created {len(transcript_blocks)} blocks")

            elif os.path.exists("/opt/homebrew/bin/whisper-cli"):
                print(f"🚀 [BACKEND] Starting whisper-cli transcription for: {temp_file.name}")
                yield f"data: {json.dumps({'progress': 10, 'message': 'Transcribing with whisper.cpp (FREE!)...'})}\n\n"
                await asyncio.sleep(0.1)
                
                progress_queue = asyncio.Queue()
                print("⚙️  [BACKEND] Creating transcription task...")
                transcription_task = asyncio.create_task(
                    transcribe_with_whisper_cpp(temp_file.name, progress_queue)
                )
                
                last_progress = 10
                print("📡 [BACKEND] Streaming progress updates to frontend...")
                while not transcription_task.done():
                    try:
                        progress_pct, message = await asyncio.wait_for(
                            progress_queue.get(),
                            timeout=0.5
                        )
                        if progress_pct > last_progress:
                            last_progress = progress_pct
                            print(f"📤 [BACKEND] Sending to frontend: {progress_pct}% - {message}")
                            yield f"data: {json.dumps({'progress': progress_pct, 'message': message})}\n\n"
                    except asyncio.TimeoutError:
                        pass
                
                print("⏳ [BACKEND] Awaiting final transcription result...")
                transcript_blocks = await transcription_task
                print(f"🎉 [BACKEND] whisper-cli complete! Created {len(transcript_blocks)} blocks")
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"
                await asyncio.sleep(0.1)
                
            else:
                print("📋 [BACKEND] No transcription method available, using mock data")
                yield f"data: {json.dumps({'progress': 50, 'message': 'Using mock data...'})}\n\n"
                await asyncio.sleep(1)
                transcript_blocks = generate_mock_transcript()
            
            # Generate waveform visualization (fast, while audio file still exists)
            print(f"🎵 [BACKEND] Generating waveform visualization...")
            yield f"data: {json.dumps({'progress': 92, 'message': 'Generating waveform...'})}\n\n"
            await asyncio.sleep(0.1)
            
            from services.waveform_service import generate_waveform_universal
            waveform_data = generate_waveform_universal(temp_file.name, samples=275)
            print(f"✅ [BACKEND] Waveform generated with {len(waveform_data)} bars")
            
            print(f"📦 [BACKEND] Preparing final response with {len(transcript_blocks)} blocks...")
            transcript_data = [block.model_dump() for block in transcript_blocks]
            print(f"💾 [BACKEND] Serialized transcript size: {len(str(transcript_data))} chars")
            print(f"🎬 [BACKEND] Sending 100% complete to frontend!")
            yield f"data: {json.dumps({'progress': 100, 'message': 'Complete!', 'transcript': transcript_data, 'waveform': waveform_data})}\n\n"
            
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
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
