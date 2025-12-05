import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from google.cloud import firestore as google_firestore
import firebase_admin
from services.storage_service import storage_service

# Initialize Firestore
_db = None

def get_firestore_db():
    global _db
    if _db is None:
        try:
            # Bypass firebase_admin wrapper to specify database name directly
            app = firebase_admin.get_app()
            creds = app.credential.get_credential()
            project_id = app.project_id
            
            _db = google_firestore.Client(
                credentials=creds, 
                project=project_id, 
                database='interviewlens'
            )
            print(f"✅ Connected to Firestore DB: interviewlens (Project: {project_id})")
        except Exception as e:
            print(f"⚠️ Error initializing Firestore client: {e}")
            raise e
    return _db

def init_db():
    """No-op for Firestore (client initialized on first use)"""
    pass

def get_db():
    """Returns the Firestore client"""
    return get_firestore_db()

def _get_interviews_ref(user_id: str):
    return get_firestore_db().collection('users').document(user_id).collection('interviews')

def _get_interview_doc(user_id: str, interview_id: int):
    return _get_interviews_ref(user_id).document(str(interview_id))



def save_interview(
    user_id: str,
    interview_id: int,
    title: str,
    audio_url: Optional[str] = None
) -> int:
    """
    Link audio URL to an interview or create minimal metadata if missing.
    All distinct data (transcript, analysis, etc.) is now saved directly from Frontend.
    """
    print(f"💾 [SAVE] Linking audio_url for interview {interview_id}...", flush=True)
    
    doc_ref = _get_interview_doc(user_id, interview_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        # Fallback: Validation or minimal create if frontend failed?
        # For now, let's assume valid flow is Frontend creates first.
        # But we create basic doc just in case to avoid crash.
        now = datetime.utcnow().isoformat()
        interview_data = {
            'id': interview_id,
            'title': title,
            'audio_url': audio_url,
            'created_at': now,
            'updated_at': now
        }
        doc_ref.set(interview_data, merge=True)
        print(f"⚠️ [SAVE] Created missing document for {interview_id}")
    else:
        # Just update audio_url
        if audio_url:
            doc_ref.update({'audio_url': audio_url})
            
    print(f"✅ Linked audio for interview {interview_id}")
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
    """Update an existing interview in Firestore"""
    doc_ref = _get_interview_doc(user_id, interview_id)
    
    # Verify existence
    doc_snap = doc_ref.get()
    if not doc_snap.exists:
        return False
        
    now = datetime.utcnow().isoformat()
    updates = {'updated_at': now}
    
    # Metadata updates
    if title:
        updates['title'] = title
    if audio_url:
        updates['audio_url'] = audio_url
        
    # Transcript updates
    if transcript_words is not None:
        # audio_duration should be passed in or handled by frontend. 
        # We don't recalculate it here to avoid duplicate logic.
        
        # Update preview
        t_text = transcript_text if transcript_text is not None else ""
        if not t_text and transcript_words:
             # Reconstruct if text not provided (simple approach)
             pass 
        if t_text:
             updates['transcript_preview'] = t_text[:200] + '...' if len(t_text) > 200 else t_text

        # Update transcript doc
        transcript_update = {'words': transcript_words}
        if transcript_text is not None:
            transcript_update['text'] = transcript_text
            
        doc_ref.collection('data').document('transcript').set(transcript_update, merge=True)
        
    # Analysis updates
    if analysis_data is not None:
        doc_ref.collection('data').document('analysis').set(analysis_data) # Full replace or merge? Analysis is usually full object.
        
    # Apply metadata updates
    doc_ref.update(updates)
    
    return True

def get_interview(user_id: str, interview_id: int) -> Optional[Dict[str, Any]]:
    """Get a single interview by ID (combines metadata and heavy data)"""
    doc_ref = _get_interview_doc(user_id, interview_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return None
        
    data = doc.to_dict()
    
    # Fetch sub-collection data
    # Use transactional/batch get if possible, or parallel awaits. 
    # For now, simple sequential gets are fine for this scale and ensure simplicity.
    
    # Create references for sub-documents
    data_col = doc_ref.collection('data')
    transcript_ref = data_col.document('transcript')
    analysis_ref = data_col.document('analysis')
    waveform_ref = data_col.document('waveform')
    
    # Fetch all sub-documents in parallel using get_all
    # This reduces round-trips from 3 to 1
    # get_all returns a generator, so we must consume it into a list
    # sub_docs = list(get_firestore_db().get_all([transcript_ref, analysis_ref, waveform_ref]))
    
    # transcript_doc = sub_docs[0]
    # analysis_doc = sub_docs[1]
    # waveform_doc = sub_docs[2]
    
    # Reverting to sequential for debugging
    transcript_doc = transcript_ref.get()
    analysis_doc = analysis_ref.get()
    waveform_doc = waveform_ref.get()
    
    transcript_data = transcript_doc.to_dict() if transcript_doc.exists else {}
    print(f"🔍 [DEBUG] Transcript doc exists: {transcript_doc.exists}", flush=True)
    print(f"🔍 [DEBUG] Transcript keys: {list(transcript_data.keys())}", flush=True)
    
    analysis_data = analysis_doc.to_dict() if analysis_doc.exists else {}
    waveform_data = waveform_doc.to_dict() if waveform_doc.exists else {}
    
    words = transcript_data.get('words', [])
    print(f"🔍 [DEBUG] Transcript words count: {len(words)}", flush=True)

    # Combine into the legacy format expected by Frontend
    return {
        'id': data.get('id'),
        'title': data.get('title'),
        'transcript_text': transcript_data.get('text', ''),
        'transcript_words': words,
        'analysis_data': analysis_data,
        'audio_url': data.get('audio_url'),
        'audio_duration': data.get('audio_duration'),
        'waveform_data': waveform_data.get('data', []),
        'created_at': data.get('created_at'),
        'updated_at': data.get('updated_at')
    }

def get_interviews(user_id: str, search: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Get interview metadata list"""
    ref = _get_interviews_ref(user_id)
    
    # Apply ordering
    query = ref.order_by('created_at', direction=google_firestore.Query.DESCENDING)
    
    # Note: Firestore filtering + ordering requires composite indexes.
    # For a hackathon, client-side filtering or simple ordering is easier.
    # If search is present, we might need to fetch more and filter in python 
    # OR use a specific field for search.
    # Given the "List" requirement, we'll fetch ordered by date and verify limits.
    
    # If search is provided, we can't easily combine with 'created_at' sort without index.
    # We will fetch latest N and filter, or just fetch all (if < 100) and filter.
    # Let's assume fetching latest 50 is fine.
    
    docs = query.limit(limit).stream()
    
    results = []
    for doc in docs:
        d = doc.to_dict()
        # Basic search (case-insensitive)
        if search:
            s = search.lower()
            if s not in d.get('title', '').lower() and s not in d.get('transcript_preview', '').lower():
                continue
        results.append(d)
        
    return results

def get_interview_summaries(user_id: str, search: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Get interview summaries from the index"""
    # This function now directly calls get_interviews as the Firestore implementation
    # provides summaries directly from the main document.
    return get_interviews(user_id, search, limit, offset)

def delete_interview(user_id: str, interview_id: int) -> bool:
    """Delete an interview and its sub-resources"""
    doc_ref = _get_interview_doc(user_id, interview_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return False
        
    metadata = doc.to_dict()
    
    # 1. Delete Audio File from GCS (Preserved Logic)
    audio_url = metadata.get('audio_url')
    if audio_url:
        try:
            # Handle query parameters (e.g. ?token=...)
            clean_url = audio_url.split('?')[0]
            
            # Extract filename
            # Handles both /api/audio/filename.mp3 and full GCS URLs
            filename = clean_url.split('/')[-1]
            
            if filename:
                # Reconstruct path based on our known structure: {user_id}/audio/{filename}
                # NOTE: This assumes the file resides in the user's audio folder.
                # If we support other paths, we might need a more sophisticated parse 
                # or store storage_path in metadata.
                audio_path = f"{user_id}/audio/{filename}"
                
                print(f"🗑️ Attempting to delete audio blob: {audio_path} (derived from {audio_url})")
                storage_service.delete_file(audio_path)
                print(f"✅ Deleted audio file: {audio_path}")
        except Exception as e:
            print(f"⚠️ Failed to delete audio file: {e}")
            
    # 2. Delete Sub-collections data
    # Firestore requires deleting documents inside subcollections manually
    # or using a recursive delete helper.
    # We know our structure: 'data' -> [transcript, analysis, waveform], 'notes' -> [...]
    
    # Delete 'data' docs
    data_col = doc_ref.collection('data')
    for subdoc in ['transcript', 'analysis', 'waveform']:
        data_col.document(subdoc).delete()
        
    # Delete 'notes' docs
    notes_col = doc_ref.collection('notes')
    for note in notes_col.stream():
        note.reference.delete()
        
    # 3. Delete Main Document
    doc_ref.delete()
    
    print(f"🗑️ Deleted interview document: {interview_id}")
    return True


# --- Notes Functions (Refactored for usage with Firestore) ---

def _find_note_ref(user_id: str, note_id: int):
    # This searches ALL 'notes' collections. We must verify ownership (user_id).
    # But notes are under `users/{uid}/interviews/{iid}/notes`.
    # So if we find it, we can check the path parent.parent.parent.key == user_id
    
    # Note: Requires index on 'id'? Not for equality usually?
    # Actually, easiest is:
    # db.collection_group('notes').where('id', '==', note_id).stream()
    
    docs = list(get_firestore_db().collection_group('notes').where('id', '==', note_id).stream())
    for doc in docs:
        # Check path: users/UID/interviews/IID/notes/NID
        # doc.reference.path .split('/')
        # ['users', 'uid', 'interviews', 'iid', 'notes', 'nid']
        path_parts = doc.reference.path.split('/')
        if len(path_parts) >= 2 and path_parts[1] == user_id:
             return doc.reference
    return None

def add_note(user_id: str, interview_id: int, timestamp: float, content: str, is_bookmark: bool = False) -> int:
    note_id = int(time.time() * 1000)
    now = datetime.utcnow().isoformat()
    
    note_data = {
        'id': note_id,
        'interview_id': interview_id,
        'timestamp': timestamp,
        'content': content,
        'is_bookmark': is_bookmark,
        'created_at': now,
        'updated_at': now
    }
    
    doc_ref = _get_interview_doc(user_id, interview_id)
    doc_ref.collection('notes').document(str(note_id)).set(note_data)
    
    return note_id

def update_note(user_id: str, note_id: int, content: Optional[str] = None, is_bookmark: Optional[bool] = None) -> bool:
    ref = _find_note_ref(user_id, note_id)
    if ref:
        updates = {'updated_at': datetime.utcnow().isoformat()}
        if content is not None:
            updates['content'] = content
        if is_bookmark is not None:
            updates['is_bookmark'] = is_bookmark
        ref.update(updates)
        return True
    return False

def get_notes(user_id: str, interview_id: int) -> List[Dict[str, Any]]:
    doc_ref = _get_interview_doc(user_id, interview_id)
    docs = doc_ref.collection('notes').order_by('timestamp').stream()
    return [doc.to_dict() for doc in docs]

def delete_note(user_id: str, note_id: int) -> bool:
    ref = _find_note_ref(user_id, note_id)
    if ref:
        ref.delete()
        return True
    return False
