import time
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from services.storage_service import storage_service

def init_db():
    """No-op for GCS storage (schema not needed)"""
    pass

def get_db():
    """No-op for GCS storage"""
    pass

def _get_interview_path(user_id: str, interview_id: int) -> str:
    return f"{user_id}/interviews/{interview_id}"

def calculate_audio_duration(transcript_words: List[Dict[str, Any]]) -> Optional[float]:
    """Calculate total audio duration from transcript blocks"""
    if not transcript_words or len(transcript_words) == 0:
        return None
    last_block = transcript_words[-1]
    if 'timestamp' in last_block and 'duration' in last_block:
        return last_block['timestamp'] + last_block['duration']
    return None

def save_interview(
    user_id: str,
    title: str,
    transcript_text: str,
    transcript_words: List[Dict[str, Any]],
    analysis_data: Dict[str, Any],
    audio_url: Optional[str] = None,
    waveform_data: Optional[List[float]] = None
) -> int:
    """Save a new interview to GCS"""
    # Generate a unique ID (timestamp based)
    interview_id = int(time.time() * 1000)
    now = datetime.utcnow().isoformat()
    
    audio_duration = calculate_audio_duration(transcript_words)
    
    base_path = _get_interview_path(user_id, interview_id)
    
    # 1. Save Metadata
    metadata = {
        'id': interview_id,
        'title': title,
        'audio_url': audio_url,
        'audio_duration': audio_duration,
        'created_at': now,
        'updated_at': now
    }
    storage_service.upload_json(f"{base_path}/metadata.json", metadata)
    
    # 2. Save Transcript
    transcript_data = {
        'text': transcript_text[:200],
        'words': transcript_words
    }
    storage_service.upload_json(f"{base_path}/transcript.json", transcript_data)
    
    # 3. Save Analysis
    storage_service.upload_json(f"{base_path}/analysis.json", analysis_data)
    
    # 4. Save Waveform
    if waveform_data:
        storage_service.upload_json(f"{base_path}/waveform.json", waveform_data)
        
    # 5. Initialize Notes
    storage_service.upload_json(f"{base_path}/notes.json", [])
    
    # 6. Update Index
    summary = {
        'id': interview_id,
        'title': title,
        'transcript_preview': transcript_text,
        'audio_url': audio_url,
        'created_at': now,
        'updated_at': now
    }
    storage_service.add_to_index(user_id, summary)
    
    return interview_id

def update_interview(
    user_id: str,
    interview_id: int,
    title: Optional[str] = None,
    transcript_text: Optional[str] = None,
    transcript_words: Optional[List[Dict[str, Any]]] = None,
    analysis_data: Optional[Dict[str, Any]] = None,
    audio_url: Optional[str] = None
) -> bool:
    """Update an existing interview in GCS"""
    base_path = _get_interview_path(user_id, interview_id)
    
    # Fetch current metadata to ensure existence
    metadata = storage_service.download_json(f"{base_path}/metadata.json")
    if not metadata:
        return False
        
    now = datetime.utcnow().isoformat()
    metadata['updated_at'] = now
    
    # Update Metadata fields
    if title:
        metadata['title'] = title
    if audio_url:
        metadata['audio_url'] = audio_url
        
    # Update Transcript if needed
    if transcript_words is not None:
        current_transcript = storage_service.download_json(f"{base_path}/transcript.json") or {}
        if transcript_words is not None:
            current_transcript['words'] = transcript_words
            # Recalculate duration
            metadata['audio_duration'] = calculate_audio_duration(transcript_words)
            
        storage_service.upload_json(f"{base_path}/transcript.json", current_transcript)
        
    # Update Analysis if needed
    if analysis_data is not None:
        storage_service.upload_json(f"{base_path}/analysis.json", analysis_data)
        
    # Save updated metadata
    storage_service.upload_json(f"{base_path}/metadata.json", metadata)
    
    # Update Index
    transcript_text = ""
    while len(transcript_text) < 200:
        transcript_text += " " + transcript_words.pop(0)['text']
    transcript_text = transcript_text.strip()
    
    summary = {
        'id': interview_id,
        'title': metadata['title'],
        'transcript_preview': transcript_text,
        'audio_url': metadata.get('audio_url'),
        'created_at': metadata['created_at'],
        'updated_at': now
    }
    storage_service.add_to_index(user_id, summary)
    
    return True

def get_interview(user_id: str, interview_id: int) -> Optional[Dict[str, Any]]:
    """Get a single interview by ID (combines all files)"""
    base_path = _get_interview_path(user_id, interview_id)
    
    metadata = storage_service.download_json(f"{base_path}/metadata.json")
    if not metadata:
        return None
        
    transcript = storage_service.download_json(f"{base_path}/transcript.json") or {'text': '', 'words': []}
    analysis = storage_service.download_json(f"{base_path}/analysis.json") or {}
    waveform = storage_service.download_json(f"{base_path}/waveform.json")
    
    return {
        'id': metadata['id'],
        'title': metadata['title'],
        'transcript_text': transcript.get('text', ''),
        'transcript_words': transcript.get('words', []),
        'analysis_data': analysis,
        'audio_url': metadata.get('audio_url'),
        'audio_duration': metadata.get('audio_duration'),
        'waveform_data': waveform,
        'created_at': metadata['created_at'],
        'updated_at': metadata['updated_at']
    }

def get_interviews(user_id: str, search: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Get all interviews (full details) - Inefficient for GCS, prefer get_interview_summaries"""
    return get_interview_summaries(user_id, search, limit, offset)

def get_interview_summaries(user_id: str, search: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Get interview summaries from the index"""
    index = storage_service.get_index(user_id)
    
    # Filter by search
    if search:
        search_lower = search.lower()
        index = [
            item for item in index 
            if search_lower in item['title'].lower() or search_lower in item.get('transcript_preview', '').lower()
        ]
        
    # Sort by created_at desc (assuming index is already sorted or we sort here)
    index.sort(key=lambda x: x['updated_at'], reverse=True)
    
    # Pagination
    return index[offset : offset + limit]

def delete_interview(user_id: str, interview_id: int) -> bool:
    """Delete an interview"""
    base_path = _get_interview_path(user_id, interview_id)
    
    # Check if exists
    if not storage_service.download_json(f"{base_path}/metadata.json"):
        return False
        
    # Delete all files
    files = [
        "metadata.json", "transcript.json", "analysis.json", 
        "waveform.json", "notes.json"
    ]
    for f in files:
        storage_service.delete_file(f"{base_path}/{f}")
        
    # Remove from index
    storage_service.remove_from_index(user_id, interview_id)
    
    return True

# Notes Functions

def _get_note_mapping_path(user_id: str) -> str:
    return f"{user_id}/notes_mapping.json"

def _get_interview_id_for_note(user_id: str, note_id: int) -> Optional[int]:
    """Helper to find interview_id for a note_id"""
    mapping = storage_service.download_json(_get_note_mapping_path(user_id)) or {}
    return mapping.get(str(note_id))

def _save_note_mapping(user_id: str, note_id: int, interview_id: int):
    path = _get_note_mapping_path(user_id)
    mapping = storage_service.download_json(path) or {}
    mapping[str(note_id)] = interview_id
    storage_service.upload_json(path, mapping)

def _remove_note_mapping(user_id: str, note_id: int):
    path = _get_note_mapping_path(user_id)
    mapping = storage_service.download_json(path) or {}
    if str(note_id) in mapping:
        del mapping[str(note_id)]
        storage_service.upload_json(path, mapping)

def add_note(user_id: str, interview_id: int, timestamp: float, content: str, is_bookmark: bool = False) -> int:
    base_path = _get_interview_path(user_id, interview_id)
    notes = storage_service.download_json(f"{base_path}/notes.json") or []
    
    note_id = int(time.time() * 1000)
    now = datetime.utcnow().isoformat()
    
    new_note = {
        'id': note_id,
        'interview_id': interview_id,
        'timestamp': timestamp,
        'content': content,
        'is_bookmark': is_bookmark,
        'created_at': now,
        'updated_at': now
    }
    
    notes.append(new_note)
    storage_service.upload_json(f"{base_path}/notes.json", notes)
    
    # Update mapping
    _save_note_mapping(user_id, note_id, interview_id)
    
    return note_id

def update_note(user_id: str, note_id: int, content: Optional[str] = None, is_bookmark: Optional[bool] = None) -> bool:
    interview_id = _get_interview_id_for_note(user_id, note_id)
    if not interview_id:
        return False
        
    base_path = _get_interview_path(user_id, interview_id)
    notes = storage_service.download_json(f"{base_path}/notes.json") or []
    
    updated = False
    for note in notes:
        if note['id'] == note_id:
            if content is not None:
                note['content'] = content
            if is_bookmark is not None:
                note['is_bookmark'] = is_bookmark
            note['updated_at'] = datetime.utcnow().isoformat()
            updated = True
            break
            
    if updated:
        storage_service.upload_json(f"{base_path}/notes.json", notes)
        
    return updated

def get_notes(user_id: str, interview_id: int) -> List[Dict[str, Any]]:
    base_path = _get_interview_path(user_id, interview_id)
    notes = storage_service.download_json(f"{base_path}/notes.json") or []
    return notes

def delete_note(user_id: str, note_id: int) -> bool:
    interview_id = _get_interview_id_for_note(user_id, note_id)
    if not interview_id:
        return False
        
    base_path = _get_interview_path(user_id, interview_id)
    notes = storage_service.download_json(f"{base_path}/notes.json") or []
    
    initial_len = len(notes)
    notes = [n for n in notes if n['id'] != note_id]
    
    if len(notes) < initial_len:
        storage_service.upload_json(f"{base_path}/notes.json", notes)
        _remove_note_mapping(user_id, note_id)
        return True
        
    return False
