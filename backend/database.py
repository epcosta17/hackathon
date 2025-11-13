import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
import os

# Get the directory where this script is located
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BACKEND_DIR, "interviews.db")

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with schema"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            transcript_text TEXT NOT NULL,
            transcript_words TEXT NOT NULL,
            analysis_data TEXT NOT NULL,
            audio_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER NOT NULL,
            timestamp REAL NOT NULL,
            content TEXT NOT NULL,
            is_bookmark INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (interview_id) REFERENCES interviews (id) ON DELETE CASCADE
        )
    ''')
    
    # Add audio_url column if it doesn't exist (for existing databases)
    # Try both old column name (audio_filename) and new (audio_url) for migration
    try:
        cursor.execute('ALTER TABLE interviews ADD COLUMN audio_url TEXT')
        conn.commit()
    except sqlite3.OperationalError:
        # Column already exists or table has audio_filename
        pass
    
    # Migrate audio_filename to audio_url if needed
    try:
        cursor.execute("SELECT audio_filename FROM interviews LIMIT 1")
        # If we can select audio_filename, we need to migrate
        cursor.execute('''
            UPDATE interviews 
            SET audio_url = '/api/audio/' || audio_filename 
            WHERE audio_filename IS NOT NULL AND audio_url IS NULL
        ''')
        conn.commit()
    except sqlite3.OperationalError:
        # audio_filename column doesn't exist, no migration needed
        pass
    
    conn.commit()
    conn.close()

def save_interview(
    title: str,
    transcript_text: str,
    transcript_words: List[Dict[str, Any]],
    analysis_data: Dict[str, Any],
    audio_url: Optional[str] = None
) -> int:
    """Save a new interview to the database"""
    conn = get_db()
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    
    cursor.execute('''
        INSERT INTO interviews (title, transcript_text, transcript_words, analysis_data, audio_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        title,
        transcript_text,
        json.dumps(transcript_words),
        json.dumps(analysis_data),
        audio_url,
        now,
        now
    ))
    
    interview_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return interview_id

def update_interview(
    interview_id: int,
    title: Optional[str] = None,
    transcript_text: Optional[str] = None,
    transcript_words: Optional[List[Dict[str, Any]]] = None,
    analysis_data: Optional[Dict[str, Any]] = None,
    audio_url: Optional[str] = None
) -> bool:
    """Update an existing interview"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get current data
    cursor.execute('SELECT * FROM interviews WHERE id = ?', (interview_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return False
    
    # Update fields
    now = datetime.utcnow().isoformat()
    
    # Safely get current audio_url
    try:
        current_audio_url = row['audio_url']
    except (KeyError, IndexError):
        current_audio_url = None
    
    cursor.execute('''
        UPDATE interviews 
        SET title = ?,
            transcript_text = ?,
            transcript_words = ?,
            analysis_data = ?,
            audio_url = ?,
            updated_at = ?
        WHERE id = ?
    ''', (
        title if title is not None else row['title'],
        transcript_text if transcript_text is not None else row['transcript_text'],
        json.dumps(transcript_words) if transcript_words is not None else row['transcript_words'],
        json.dumps(analysis_data) if analysis_data is not None else row['analysis_data'],
        audio_url if audio_url is not None else current_audio_url,
        now,
        interview_id
    ))
    
    conn.commit()
    conn.close()
    
    return True

def get_interview(interview_id: int) -> Optional[Dict[str, Any]]:
    """Get a single interview by ID"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM interviews WHERE id = ?', (interview_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    if not row:
        return None
    
    # Safely get audio_url (may not exist in older records)
    try:
        audio_url = row['audio_url']
    except (KeyError, IndexError):
        audio_url = None
    
    return {
        'id': row['id'],
        'title': row['title'],
        'transcript_text': row['transcript_text'],
        'transcript_words': json.loads(row['transcript_words']),
        'analysis_data': json.loads(row['analysis_data']),
        'audio_url': audio_url,
        'created_at': row['created_at'],
        'updated_at': row['updated_at']
    }

def get_interviews(search: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Get all interviews, optionally filtered by search term"""
    conn = get_db()
    cursor = conn.cursor()
    
    if search:
        cursor.execute('''
            SELECT * FROM interviews 
            WHERE title LIKE ? OR transcript_text LIKE ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (f'%{search}%', f'%{search}%', limit, offset))
    else:
        cursor.execute('''
            SELECT * FROM interviews 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (limit, offset))
    
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        # Safely get audio_url
        try:
            audio_url = row['audio_url']
        except (KeyError, IndexError):
            audio_url = None
        
        results.append({
            'id': row['id'],
            'title': row['title'],
            'transcript_text': row['transcript_text'],
            'transcript_words': json.loads(row['transcript_words']),
            'analysis_data': json.loads(row['analysis_data']),
            'audio_url': audio_url,
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
    
    return results

def get_interview_summaries(search: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Get interview summaries (without full transcript words for performance)"""
    conn = get_db()
    cursor = conn.cursor()
    
    if search:
        cursor.execute('''
            SELECT id, title, transcript_text, audio_url, created_at, updated_at
            FROM interviews 
            WHERE title LIKE ? OR transcript_text LIKE ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (f'%{search}%', f'%{search}%', limit, offset))
    else:
        cursor.execute('''
            SELECT id, title, transcript_text, audio_url, created_at, updated_at
            FROM interviews 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', (limit, offset))
    
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        # Safely get audio_url
        try:
            audio_url = row['audio_url']
        except (KeyError, IndexError):
            audio_url = None
        
        results.append({
            'id': row['id'],
            'title': row['title'],
            'transcript_preview': row['transcript_text'][:200] + '...' if len(row['transcript_text']) > 200 else row['transcript_text'],
            'audio_url': audio_url,
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
    
    return results

def delete_interview(interview_id: int) -> bool:
    """Delete an interview"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM interviews WHERE id = ?', (interview_id,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return deleted

# Notes and Bookmarks Functions

def add_note(interview_id: int, timestamp: float, content: str, is_bookmark: bool = False) -> int:
    """Add a note or bookmark to an interview"""
    conn = get_db()
    cursor = conn.cursor()
    
    now = datetime.utcnow().isoformat()
    
    cursor.execute('''
        INSERT INTO notes (interview_id, timestamp, content, is_bookmark, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (interview_id, timestamp, content, 1 if is_bookmark else 0, now, now))
    
    note_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return note_id

def update_note(note_id: int, content: Optional[str] = None, is_bookmark: Optional[bool] = None) -> bool:
    """Update an existing note"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM notes WHERE id = ?', (note_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return False
    
    now = datetime.utcnow().isoformat()
    
    cursor.execute('''
        UPDATE notes 
        SET content = ?,
            is_bookmark = ?,
            updated_at = ?
        WHERE id = ?
    ''', (
        content if content is not None else row['content'],
        (1 if is_bookmark else 0) if is_bookmark is not None else row['is_bookmark'],
        now,
        note_id
    ))
    
    conn.commit()
    conn.close()
    
    return True

def get_notes(interview_id: int) -> List[Dict[str, Any]]:
    """Get all notes for an interview"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM notes 
        WHERE interview_id = ?
        ORDER BY timestamp ASC
    ''', (interview_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        results.append({
            'id': row['id'],
            'interview_id': row['interview_id'],
            'timestamp': row['timestamp'],
            'content': row['content'],
            'is_bookmark': bool(row['is_bookmark']),
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
    
    return results

def delete_note(note_id: int) -> bool:
    """Delete a note"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    return deleted

