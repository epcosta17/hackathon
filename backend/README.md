# Backend - AI Interview Analysis Platform

FastAPI backend for AI-powered interview analysis with local transcription, Google Gemini integration, and automated report generation.

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- whisper.cpp (`brew install whisper-cpp`)
- Google Gemini API key (optional, uses mock data as fallback)

### Installation

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Download Whisper model (only needed once)
cd ai
./download-ggml-model.sh
cd ..

# Optional: Set up environment variables
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### Running the Server

```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Server will start at `http://127.0.0.1:8000`

API documentation: `http://127.0.0.1:8000/`

## 📁 Project Structure

```
backend/
├── main.py                    # FastAPI app entry point
├── database.py                # SQLite database operations
├── models/
│   └── schemas.py            # Pydantic data models
├── services/
│   ├── transcription_service.py   # Audio transcription logic
│   ├── analysis_service.py        # AI analysis logic
│   └── docx_service.py           # Report generation
├── routes/
│   ├── transcription.py      # Transcription endpoints
│   ├── analysis.py           # Analysis endpoints
│   ├── interviews.py         # Interview CRUD endpoints
│   └── notes.py              # Notes endpoints
├── ai/
│   ├── ggml-base.bin         # Whisper model
│   ├── download-ggml-model.sh # Model download script
│   └── PROMPT_JSON.md        # AI prompts for analysis
└── requirements.txt
```

## 🔌 API Endpoints

### Transcription
- `POST /api/transcribe-stream` - Upload and transcribe audio (Server-Sent Events)
- `GET /api/audio/{filename}` - Serve audio files

### Analysis
- `POST /api/analyze` - Generate AI analysis from transcript
- `POST /api/generate-report` - Generate DOCX from existing analysis
- `POST /api/download-report` - Download generated DOCX report
- `GET /api/ping` - Health check

### Interviews
- `POST /api/interviews` - Create new interview
- `GET /api/interviews` - List all interviews (supports search)
- `GET /api/interviews/{id}` - Get interview by ID
- `PUT /api/interviews/{id}` - Update interview
- `DELETE /api/interviews/{id}` - Delete interview

### Notes & Bookmarks
- `POST /api/interviews/{id}/notes` - Add note/bookmark
- `GET /api/interviews/{id}/notes` - Get all notes for interview
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note

## 🛠️ Architecture

### Layered Design

1. **Routes Layer** (`routes/`)
   - HTTP request/response handling
   - Input validation
   - API endpoint definitions

2. **Services Layer** (`services/`)
   - Business logic
   - External API integration
   - File processing

3. **Database Layer** (`database.py`)
   - Data persistence
   - CRUD operations
   - SQLite integration

4. **Models Layer** (`models/`)
   - Pydantic schemas
   - Data validation
   - Type definitions

### Key Features

- **Modular Structure**: Clean separation of concerns
- **No Circular Dependencies**: Clear import hierarchy
- **Async/Await**: Non-blocking I/O operations
- **Background Tasks**: Long-running operations don't block API
- **Server-Sent Events**: Real-time progress updates for transcription
- **In-Memory Caching**: Fast DOCX report retrieval

## 📊 Database Schema

### Interviews Table
```sql
CREATE TABLE interviews (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    transcript_text TEXT,
    transcript_words JSON,
    analysis_data JSON,
    audio_url TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Notes Table
```sql
CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    interview_id INTEGER,
    timestamp REAL,
    content TEXT,
    is_bookmark INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id)
)
```

## 🔑 Environment Variables

Create a `.env` file in the backend directory:

```env
# Optional: Google Gemini API for AI analysis
GEMINI_API_KEY=your_api_key_here

# Optional: OpenAI API for transcription (alternative to whisper.cpp)
OPENAI_API_KEY=your_api_key_here
```

**Fallback Behavior:**
- No `GEMINI_API_KEY`: Uses mock analysis data
- No `whisper.cpp`: Uses mock transcription data

## 📦 Dependencies

Core dependencies:
- `fastapi==0.115.0` - Web framework
- `uvicorn[standard]==0.32.0` - ASGI server
- `pydantic==2.9.2` - Data validation
- `google-generativeai` - Gemini API
- `python-docx` - DOCX generation
- `python-dotenv` - Environment variables
- `python-multipart` - File upload support

See `requirements.txt` for full list.

## 🐛 Troubleshooting

### whisper.cpp not found
```bash
brew install whisper-cpp
```

### Model not found
```bash
cd ai
./download-ggml-model.sh
```

### Port already in use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or change port
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### Gemini API errors
- Check your API key in `.env`
- The app will automatically fall back to mock data if the API fails

### Database locked errors
- Close any other connections to `interviews.db`
- Restart the server

## 🧪 Testing

### Manual Testing
Use the interactive API docs at `http://127.0.0.1:8000/`:
1. Click "Try it out" on any endpoint
2. Fill in parameters
3. Execute the request
4. View response

### Testing with curl
```bash
# Health check
curl http://127.0.0.1:8000/api/ping

# Upload audio
curl -X POST http://127.0.0.1:8000/api/transcribe-stream \
  -F "audio_file=@interview.mp3"

# List interviews
curl http://127.0.0.1:8000/api/interviews
```

## 🚀 Adding New Features

### Example: Adding a new endpoint

1. **Define models** in `models/schemas.py`:
```python
class NewFeatureRequest(BaseModel):
    field1: str
    field2: int
```

2. **Implement logic** in `services/`:
```python
# services/new_feature_service.py
def process_feature(request):
    # Business logic here
    return result
```

3. **Create route** in `routes/`:
```python
# routes/new_feature.py
from fastapi import APIRouter
router = APIRouter(prefix="/api", tags=["new-feature"])

@router.post("/new-feature")
async def new_feature_endpoint(request: NewFeatureRequest):
    return process_feature(request)
```

4. **Register router** in `main.py`:
```python
from routes import new_feature
app.include_router(new_feature.router)
```

## 📈 Performance Tips

### Apple Silicon Optimization
- whisper.cpp automatically uses Metal for GPU acceleration
- No additional configuration needed
- Transcription is faster than real-time

### Production Deployment
- Use `gunicorn` with multiple workers
- Set up proper logging
- Use a production database (PostgreSQL, MySQL)
- Implement rate limiting
- Add authentication/authorization

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [whisper.cpp GitHub](https://github.com/ggerganov/whisper.cpp)
- [Google Gemini API](https://ai.google.dev/)

## 📄 License

MIT License

---

**Need help?** Check the interactive API docs at `http://127.0.0.1:8000/` when the server is running.
