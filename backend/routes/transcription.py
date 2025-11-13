"""Transcription-related API routes."""
import os
import json
import asyncio
import tempfile
from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from pathlib import Path

router = APIRouter(prefix="/api", tags=["transcription"])

# Import transcription functions from service
from services.transcription_service import transcribe_with_whisper_cpp, generate_mock_transcript


@router.post("/transcribe-stream")
async def transcribe_stream_endpoint(audio_file: UploadFile = File(...)):
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
            
            # Priority: whisper.cpp (FREE!) > WhisperX Local > OpenAI API > Mock Data
            if os.path.exists("/opt/homebrew/bin/whisper-cli"):
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
            
            print(f"📦 [BACKEND] Preparing final response with {len(transcript_blocks)} blocks...")
            transcript_data = [block.model_dump() for block in transcript_blocks]
            print(f"💾 [BACKEND] Serialized transcript size: {len(str(transcript_data))} chars")
            print(f"🎬 [BACKEND] Sending 100% complete to frontend!")
            yield f"data: {json.dumps({'progress': 100, 'message': 'Complete!', 'transcript': transcript_data})}\n\n"
            
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
async def get_audio_file(audio_filename: str, request: Request):
    """Serve an audio file with HTTP Range request support for parallel chunk downloading."""
    try:
        audio_dir = Path(__file__).parent.parent / "audio_files"
        audio_path = audio_dir / audio_filename
        
        if not audio_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        # Get file size
        file_size = audio_path.stat().st_size
        
        # Determine content type
        content_type = "audio/mpeg" if audio_filename.endswith(".mp3") else "audio/wav"
        
        # Parse Range header
        range_header = request.headers.get("range")
        
        if range_header:
            # Parse range header (format: "bytes=start-end")
            range_match = range_header.replace("bytes=", "").split("-")
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1
            
            # Ensure valid range
            start = max(0, start)
            end = min(end, file_size - 1)
            content_length = end - start + 1
            
            # Read the requested chunk
            def iter_chunk():
                with open(audio_path, mode="rb") as file_like:
                    file_like.seek(start)
                    remaining = content_length
                    chunk_size = 8192  # 8KB chunks
                    while remaining > 0:
                        read_size = min(chunk_size, remaining)
                        data = file_like.read(read_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            # Return 206 Partial Content
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            }
            return StreamingResponse(
                iter_chunk(),
                status_code=206,
                media_type=content_type,
                headers=headers
            )
        else:
            # No range request - serve full file
            def iterfile():
                with open(audio_path, mode="rb") as file_like:
                    yield from file_like
            
            headers = {
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            }
            return StreamingResponse(
                iterfile(),
                media_type=content_type,
                headers=headers
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve audio file: {str(e)}")

