"""Interview CRUD API routes."""
import os
import uuid
import json
from typing import Optional
from fastapi import APIRouter, HTTPException, File, Form, UploadFile

from models.schemas import SaveInterviewRequest, UpdateInterviewRequest
from database import (
    save_interview,
    update_interview,
    get_interview,
    get_interview_summaries,
    delete_interview,
    add_note
)

router = APIRouter(prefix="/api", tags=["interviews"])


@router.post("/interviews")
async def create_interview(
    title: str = Form(...),
    transcript_text: str = Form(...),
    transcript_words: str = Form(...),
    analysis_data: str = Form(...),
    notes: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None)
):
    """Save a new interview to the database."""
    try:
        # Parse JSON strings
        transcript_words_data = json.loads(transcript_words)
        analysis_data_dict = json.loads(analysis_data)
        notes_data = json.loads(notes) if notes else []
        
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
            audio_url=audio_url
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
async def update_interview_endpoint(interview_id: int, request: UpdateInterviewRequest):
    """Update an existing interview."""
    try:
        success = update_interview(
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
        raise HTTPException(status_code=500, detail=f"Failed to update interview: {str(e)}")


@router.get("/interviews/{interview_id}")
async def get_interview_endpoint(interview_id: int):
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
async def get_interviews_endpoint(search: Optional[str] = None):
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
async def delete_interview_endpoint(interview_id: int):
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

