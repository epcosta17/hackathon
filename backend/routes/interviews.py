"""Interview CRUD API routes."""
import os
import uuid
import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, File, Form, UploadFile, Depends

from models.schemas import SaveInterviewRequest, UpdateInterviewRequest
from database import (
    save_interview,
    update_interview,
    get_interview,
    get_interview_summaries,
    delete_interview,
    add_note
)
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api", tags=["interviews"])


@router.post("/interviews")
async def create_interview(
    title: str = Form(...),
    transcript_text: str = Form(...),
    transcript_words: str = Form(...),
    analysis_data: str = Form(...),
    notes: Optional[str] = Form(None),
    waveform_data: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Save a new interview to the database."""
    try:
        user_id = current_user['uid']
        
        # Parse JSON strings
        transcript_words_data = json.loads(transcript_words)
        print(f"📥 [CREATE] Received {len(transcript_words_data)} transcript blocks", flush=True)
        analysis_data_dict = json.loads(analysis_data)
        notes_data = json.loads(notes) if notes else []
        waveform_data_list = json.loads(waveform_data) if waveform_data else None
        
        # Save audio file if provided
        audio_url = None
        if audio_file:
            # Generate unique filename
            file_extension = os.path.splitext(audio_file.filename)[1]
            audio_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Upload to GCS
            from services.storage_service import storage_service
            import io
            
            content = await audio_file.read()
            f = io.BytesIO(content)
            # Use user-scoped path for audio too
            gcs_path = f"{user_id}/audio/{audio_filename}"
            storage_service.upload_file(gcs_path, f, content_type=audio_file.content_type)
            
            audio_url = f"/api/audio/{audio_filename}"
        
        interview_id = save_interview(
            user_id=user_id,
            title=title,
            transcript_text=transcript_text,
            transcript_words=transcript_words_data,
            analysis_data=analysis_data_dict,
            audio_url=audio_url,
            waveform_data=waveform_data_list
        )
        
        # Save notes if provided
        if notes_data:
            for note in notes_data:
                add_note(
                    user_id=user_id,
                    interview_id=interview_id,
                    timestamp=note.get('timestamp', 0),
                    content=note.get('content', ''),
                    is_bookmark=note.get('is_bookmark', False)
                )
        
        return {"id": interview_id, "message": "Interview saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save interview: {str(e)}")


@router.put("/interviews/{interview_id}")
async def update_interview_endpoint(
    interview_id: int,
    request: UpdateInterviewRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing interview."""
    try:
        user_id = current_user['uid']
        print(f"📝 [UPDATE] Interview ID: {interview_id}")
        
        success = update_interview(
            user_id=user_id,
            interview_id=interview_id,
            title=request.title,
            transcript_text=request.transcript_text,
            transcript_words=request.transcript_words,
            analysis_data=request.analysis_data
        )
        if not success:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        return {"message": "Interview updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [UPDATE] Error updating interview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update interview: {str(e)}")


@router.get("/interviews/{interview_id}")
async def get_interview_endpoint(
    interview_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve a specific interview by ID."""
    try:
        user_id = current_user['uid']
        interview = get_interview(user_id, interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return interview
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve interview: {str(e)}")


@router.get("/interviews")
async def get_interviews_endpoint(
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve all interviews or search by query."""
    try:
        user_id = current_user['uid']
        if search:
            interviews = get_interview_summaries(user_id, search)
        else:
            interviews = get_interview_summaries(user_id)
        return {"interviews": interviews, "count": len(interviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve interviews: {str(e)}")


@router.delete("/interviews/{interview_id}")
async def delete_interview_endpoint(
    interview_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete an interview."""
    try:
        user_id = current_user['uid']
        success = delete_interview(user_id, interview_id)
        if not success:
            raise HTTPException(status_code=404, detail="Interview not found")
        return {"message": "Interview deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete interview: {str(e)}")


@router.post("/interviews/{interview_id}/waveform")
async def save_waveform(
    interview_id: int,
    waveform_data: list,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Save waveform visualization data for an interview."""
    try:
        user_id = current_user['uid']
        from services.storage_service import storage_service
        
        # We need to construct the path manually or add a helper in database.py
        # But database.py doesn't expose a simple 'save_waveform' update function.
        # Let's use storage_service directly for this specific update, reusing the path logic.
        # Ideally we add update_waveform to database.py, but for now:
        gcs_path = f"{user_id}/interviews/{interview_id}/waveform.json"
        storage_service.upload_json(gcs_path, waveform_data)
        
        return {"message": "Waveform saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save waveform: {str(e)}")


@router.post("/interviews/{interview_id}/audio")
async def upload_interview_audio(
    interview_id: int,
    audio_file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload audio file for an existing interview and update its audio_url.
    This supports the "Hybrid Save" strategy where Frontend creates the interview 
    and Backend handles the heavy audio upload.
    """
    try:
        user_id = current_user['uid']
        print(f"🎙️ [UPLOAD] Receiving audio for interview {interview_id}", flush=True)

        # 1. Upload to GCS
        # Generate unique filename
        file_extension = os.path.splitext(audio_file.filename)[1]
        audio_filename = f"{uuid.uuid4()}{file_extension}"
        
        from services.storage_service import storage_service
        import io
        
        content = await audio_file.read()
        f = io.BytesIO(content)
        # Use user-scoped path
        gcs_path = f"{user_id}/audio/{audio_filename}"
        storage_service.upload_file(gcs_path, f, content_type=audio_file.content_type)
        
        audio_url = f"/api/audio/{audio_filename}"
        print(f"✅ [UPLOAD] Audio uploaded to {gcs_path}", flush=True)

        # 2. Update Firestore Document
        # We perform a partial update just for the audio_url
        update_interview(
            user_id=user_id,
            interview_id=interview_id,
            data={'audio_url': audio_url}
        )
        
        return {"message": "Audio uploaded successfully", "audio_url": audio_url}

    except Exception as e:
        print(f"❌ [UPLOAD] Failed: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload audio: {str(e)}")

