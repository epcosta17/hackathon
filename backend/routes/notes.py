"""Notes and bookmarks API routes."""
from fastapi import APIRouter, HTTPException

from models.schemas import NoteCreate, NoteUpdate
from database import add_note, update_note, get_notes, delete_note

router = APIRouter(prefix="/api", tags=["notes"])


@router.post("/interviews/{interview_id}/notes")
async def create_note(interview_id: int, note: NoteCreate):
    """Add a note or bookmark to an interview."""
    try:
        note_id = add_note(interview_id, note.timestamp, note.content, note.is_bookmark)
        return {"id": note_id, "message": "Note created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create note: {str(e)}")


@router.get("/interviews/{interview_id}/notes")
async def get_interview_notes(interview_id: int):
    """Get all notes for an interview."""
    try:
        notes = get_notes(interview_id)
        return {"notes": notes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notes: {str(e)}")


@router.put("/notes/{note_id}")
async def update_note_endpoint(note_id: int, note: NoteUpdate):
    """Update an existing note."""
    try:
        success = update_note(note_id, note.content, note.is_bookmark)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"message": "Note updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update note: {str(e)}")


@router.delete("/notes/{note_id}")
async def delete_note_endpoint(note_id: int):
    """Delete a note."""
    try:
        success = delete_note(note_id)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete note: {str(e)}")

