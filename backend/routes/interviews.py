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
        # Parse JSON strings
        transcript_words_data = json.loads(transcript_words)
        analysis_data_dict = json.loads(analysis_data)
        notes_data = json.loads(notes) if notes else []
        waveform_data_list = json.loads(waveform_data) if waveform_data else None
        
        # Save audio file if provided
        audio_url = None
        if audio_file:
            # Generate unique filename
            file_extension = os.path.splitext(audio_file.filename)[1]
            audio_filename = f"{uuid.uuid4()}{file_extension}"
            
            # DEVELOPMENT: Save locally and use API path
            audio_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "audio_files")
            os.makedirs(audio_dir, exist_ok=True)
            audio_path = os.path.join(audio_dir, audio_filename)
            
            with open(audio_path, "wb") as f:
                content = await audio_file.read()
                f.write(content)
            
            audio_url = f"/api/audio/{audio_filename}"
        
        interview_id = save_interview(
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
        print(f"📝 [UPDATE] Interview ID: {interview_id}")
        print(f"📝 [UPDATE] Title: {request.title}")
        print(f"📝 [UPDATE] Has analysis_data: {request.analysis_data is not None}")
        if request.analysis_data:
            print(f"📝 [UPDATE] Analysis data keys: {list(request.analysis_data.keys())}")
        
        success = update_interview(
            interview_id=interview_id,
            title=request.title,
            transcript_text=request.transcript_text,
            transcript_words=request.transcript_words,
            analysis_data=request.analysis_data
        )
        if not success:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        print(f"✅ [UPDATE] Interview {interview_id} updated successfully")
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
        interview = get_interview(interview_id)
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
        if search:
            interviews = get_interview_summaries(search)
        else:
            interviews = get_interview_summaries()
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
        success = delete_interview(interview_id)
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
        from database import get_db
        import json
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE interviews SET waveform_data = ? WHERE id = ?',
            (json.dumps(waveform_data), interview_id)
        )
        
        conn.commit()
        conn.close()
        
        return {"message": "Waveform saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save waveform: {str(e)}")

