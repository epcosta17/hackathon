"""Notes and bookmarks API routes."""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends

from models.schemas import NoteCreate, NoteUpdate
from database import add_note, update_note, get_notes, delete_note
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/v1", tags=["notes"])


@router.post("/interviews/{interview_id}/notes")
async def create_note(
    interview_id: int,
    note: NoteCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a note or bookmark to an interview."""
    try:
        user_id = current_user['uid']
        note_id = add_note(user_id, interview_id, note.timestamp, note.content, note.is_bookmark)
        return {"id": note_id, "message": "Note created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create note: {str(e)}")


@router.get("/interviews/{interview_id}/notes")
async def get_interview_notes(
    interview_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all notes for an interview."""
    try:
        user_id = current_user['uid']
        notes = get_notes(user_id, interview_id)
        return {"notes": notes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notes: {str(e)}")


@router.put("/notes/{note_id}")
async def update_note_endpoint(
    note_id: int,
    note: NoteUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing note."""
    try:
        user_id = current_user['uid']
        success = update_note(user_id, note_id, note.content, note.is_bookmark)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"message": "Note updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update note: {str(e)}")


@router.delete("/notes/{note_id}")
async def delete_note_endpoint(
    note_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a note."""
    try:
        user_id = current_user['uid']
        success = delete_note(user_id, note_id)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete note: {str(e)}")

