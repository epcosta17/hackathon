from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from services.storage_service import storage_service
from middleware.auth_middleware import get_current_user

router = APIRouter()

from pydantic import BaseModel

class FinalizeAudioRequest(BaseModel):
    audio_url: str

@router.post("/api/audio/finalize")
async def finalize_audio(
    request: FinalizeAudioRequest, 
    background_tasks: BackgroundTasks,
    token: dict = Depends(get_current_user)
):
    """
    Moves an audio file from temp_audio/ to audio/ (making it permanent).
    """
    user_id = token['uid']
    audio_url = request.audio_url
    
    if not audio_url:
        raise HTTPException(status_code=400, detail="Missing audio_url")
        
    # extract filename from /api/audio/temp/{filename}
    if "/api/audio/temp/" not in audio_url:
        # Already permanent or invalid? Just return it.
        return {"audio_url": audio_url}

    filename = audio_url.split('/api/audio/temp/')[-1]
    
    old_path = f"{user_id}/temp_audio/{filename}"
    new_path = f"{user_id}/audio/{filename}"
    
    print(f"📦 Finalizing audio: Moving {old_path} -> {new_path}")
    
    new_public_url = storage_service.rename_file(old_path, new_path)
    
    if not new_public_url:
        # Maybe it was already moved? check if exists in new path?
        # For now, assume failure if not found in temp
        print(f"⚠️ Failed to move file {old_path}. It might not exist.")
        # Fallback: assume it might already be correct or lost. 
        # But we return the permanent URL format anyway so the frontend saves a valid link.
        return {"audio_url": f"/api/audio/{filename}"}

    # Return the clean API URL for the permanent file
    
    # Trigger cleanup of old temp files for this user (garbage collection)
    background_tasks.add_task(storage_service.cleanup_temp_files, user_id=user_id)
    
    return {"audio_url": f"/api/audio/{filename}"}
