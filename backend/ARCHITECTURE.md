# Backend Architecture

## Overview

The backend follows a clean, modular architecture with clear separation of concerns, making it maintainable, testable, and scalable.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP/REST API + SSE
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          main.py (Entry Point)                      │
│  - FastAPI App                                                      │
│  - CORS Middleware                                                  │
│  - Router Registration                                              │
│  - Database Initialization                                          │
└────────┬─────────────┬─────────────┬─────────────┬──────────────────┘
         │             │             │             │
         ▼             ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│Transcription│ │  Analysis  │ │ Interviews │ │   Notes    │
│   Router   │ │   Router   │ │   Router   │ │   Router   │
└─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
      │              │              │              │
      │              │              ├──────────────┴────────┐
      │              │              │                       │
      ▼              ▼              ▼                       ▼
┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐
│Transcribe│  │ Analysis │  │       database.py                │
│ Service  │  │ Service  │  │  - save_interview()              │
└────┬─────┘  └────┬─────┘  │  - get_interviews()              │
     │             │         │  - update_interview()            │
     │             │         │  - delete_interview()            │
     │             │         │  - add_note()                    │
     │             ▼         │  - get_notes()                   │
     │       ┌──────────┐   │  - update_note()                 │
     │       │   DOCX   │   │  - delete_note()                 │
     │       │ Service  │   └──────────────────────────────────┘
     │       └────┬─────┘                  │
     │            │                        │
     ▼            ▼                        ▼
┌─────────────────────────────────────────────────┐
│            External Dependencies                │
│  - whisper.cpp (local transcription)            │
│  - Google Gemini API (AI analysis)              │
│  - python-docx (report generation)              │
│  - SQLite Database (data persistence)           │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
backend/
│
├── main.py                     # FastAPI application entry point
│   └── Registers all routers and initializes the app
│
├── database.py                 # Database operations and schema
│   └── SQLite CRUD operations for interviews and notes
│
├── models/
│   └── schemas.py             # Pydantic data models
│       ├── TranscriptBlock
│       ├── AnalysisData
│       ├── NoteCreate/Update
│       └── Request/Response models
│
├── services/                   # Business logic layer
│   ├── transcription_service.py
│   │   ├── transcribe_with_whisper_cpp()
│   │   ├── transcribe_with_openai()
│   │   └── generate_mock_transcript()
│   │
│   ├── analysis_service.py
│   │   └── generate_analysis_report()
│   │
│   └── docx_service.py
│       ├── generate_docx_async()
│       ├── get_cached_docx()
│       └── docx_cache
│
├── routes/                     # API endpoints layer
│   ├── transcription.py
│   │   ├── POST /api/transcribe-stream
│   │   └── GET /api/audio/{filename}
│   │
│   ├── analysis.py
│   │   ├── POST /api/analyze
│   │   ├── POST /api/generate-report
│   │   ├── POST /api/download-report
│   │   └── GET /api/ping
│   │
│   ├── interviews.py
│   │   ├── POST /api/interviews
│   │   ├── GET /api/interviews
│   │   ├── GET /api/interviews/{id}
│   │   ├── PUT /api/interviews/{id}
│   │   └── DELETE /api/interviews/{id}
│   │
│   └── notes.py
│       ├── POST /api/interviews/{id}/notes
│       ├── GET /api/interviews/{id}/notes
│       ├── PUT /api/notes/{id}
│       └── DELETE /api/notes/{id}
│
└── ai/                         # AI models and prompts
    ├── ggml-base.bin          # Whisper transcription model
    ├── download-ggml-model.sh # Model download script
    ├── PROMPT_JSON.md         # Gemini API prompts
    ├── PROMPT.md
    └── RESPONSE.md
```

## Data Flow Examples

### 1. Audio Transcription Flow
```
Frontend
   │
   │ POST /api/transcribe-stream (audio file)
   ▼
Transcription Router
   │
   │ calls
   ▼
Transcription Service
   │
   ├─► whisper.cpp binary (local)
   │   └─► returns transcript blocks
   │
   └─► streams progress updates via SSE
       │
       ▼
   Frontend receives transcript blocks in real-time
```

### 2. Interview Analysis Flow
```
Frontend
   │
   │ POST /api/analyze (transcript blocks)
   ▼
Analysis Router
   │
   │ calls
   ▼
Analysis Service
   │
   ├─► Google Gemini API
   │   └─► returns AI analysis
   │
   └─► triggers async DOCX generation
       │
       ▼
   DOCX Service
       └─► stores in cache for download
   
Frontend receives analysis data immediately
Frontend can download report when ready
```

### 3. Save Interview Flow
```
Frontend
   │
   │ POST /api/interviews (title, transcript, analysis, notes, audio)
   ▼
Interviews Router
   │
   ├─► saves audio file to disk
   │
   │ calls
   ▼
Database
   │
   ├─► save_interview()
   │   └─► returns interview_id
   │
   └─► add_note() (for each note/bookmark)
   
Frontend receives confirmation with interview_id
```

### 4. Load Previous Interview Flow
```
Frontend
   │
   │ GET /api/interviews/{id}
   ▼
Interviews Router
   │
   │ calls
   ▼
Database
   │
   └─► get_interview()
       └─► returns full interview data
   
Frontend displays transcript editor
   │
   │ GET /api/interviews/{id}/notes
   ▼
Notes Router
   │
   │ calls
   ▼
Database
   │
   └─► get_notes()
       └─► returns all notes and bookmarks
   
Frontend displays notes panel
   │
   │ POST /api/generate-report (existing analysis)
   ▼
Analysis Router
   │
   │ calls
   ▼
DOCX Service
   │
   └─► generates DOCX in background
       └─► caches for download

Frontend can download report when ready
```

## Key Design Patterns

### 1. **Layered Architecture**
- **Routes Layer**: HTTP request/response handling
- **Services Layer**: Business logic and external API integration
- **Database Layer**: Data persistence and retrieval
- **Models Layer**: Data structures and validation

### 2. **Dependency Injection**
- Routes depend on services
- Services are independent of routes
- No circular dependencies
- Clear import hierarchy

### 3. **Separation of Concerns**
- Each module has a single responsibility
- Models define data structures
- Services contain logic
- Routes handle HTTP
- Database handles persistence

### 4. **Async/Await Pattern**
- All I/O operations are async
- Non-blocking request handling
- Background tasks for long-running operations (DOCX generation)
- Server-Sent Events for streaming responses (transcription)

### 5. **In-Memory Caching**
- DOCX reports cached in memory
- Fast retrieval without regeneration
- Automatic cleanup strategy (can be enhanced)

## Benefits of This Architecture

1. **Maintainability**: Easy to locate and modify functionality
2. **Testability**: Each layer can be tested independently
3. **Scalability**: New features can be added without affecting existing code
4. **Clarity**: Clear boundaries between components
5. **Reusability**: Services can be used by multiple routes
6. **Performance**: Async operations don't block the server
7. **Developer Experience**: Easy to understand and navigate

## Component Responsibilities

### main.py
- FastAPI app initialization
- CORS configuration
- Router registration
- Startup events (database initialization)

### Routes
- Define API endpoints
- Parse request parameters
- Validate input (using Pydantic)
- Call appropriate services
- Format responses
- Handle HTTP-specific logic

### Services
- Implement business logic
- Integrate with external APIs (Gemini, whisper.cpp)
- Process data
- Generate files (DOCX)
- No direct HTTP handling

### Database
- Define schema
- CRUD operations
- Query building
- Transaction management
- Data validation at DB level

### Models
- Pydantic schemas for validation
- Type definitions
- Request/Response models
- Data transformation rules

## How to Extend

### Adding a New Feature

**Example: Adding email notifications**

1. **Define models** in `models/schemas.py`:
```python
class EmailNotification(BaseModel):
    recipient: str
    subject: str
    body: str
```

2. **Implement business logic** in `services/email_service.py`:
```python
import smtplib
from models.schemas import EmailNotification

async def send_email(notification: EmailNotification):
    # Email sending logic
    pass
```

3. **Create API routes** in `routes/notifications.py`:
```python
from fastapi import APIRouter
from services.email_service import send_email
from models.schemas import EmailNotification

router = APIRouter(prefix="/api", tags=["notifications"])

@router.post("/send-notification")
async def send_notification(notification: EmailNotification):
    await send_email(notification)
    return {"message": "Email sent"}
```

4. **Register router** in `main.py`:
```python
from routes import notifications
app.include_router(notifications.router)
```

### Adding Database Tables

1. **Update schema** in `database.py`:
```python
cursor.execute("""
    CREATE TABLE IF NOT EXISTS new_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field1 TEXT NOT NULL,
        field2 INTEGER,
        created_at TEXT NOT NULL
    )
""")
```

2. **Add CRUD functions** in `database.py`:
```python
def add_record(field1, field2):
    # Implementation
    pass

def get_records():
    # Implementation
    pass
```

3. **Use in routes** as needed

## Performance Considerations

### Async Operations
- All I/O is non-blocking
- Multiple requests handled concurrently
- Background tasks don't block API responses

### Caching Strategy
- DOCX files cached in memory
- Consider Redis for production
- Implement TTL (Time To Live) for cache entries

### Database Optimization
- SQLite for development/small deployments
- Consider PostgreSQL for production
- Add indexes for frequently queried fields
- Use connection pooling

### Apple Silicon Optimization
- whisper.cpp uses Metal acceleration
- Significantly faster than real-time
- No additional configuration needed

## Security Considerations

### Current Implementation
- CORS enabled for all origins (development)
- No authentication/authorization (MVP)
- Basic input validation via Pydantic

### Production Recommendations
- Implement JWT authentication
- Add API rate limiting
- Restrict CORS to specific origins
- Validate file uploads (size, type, content)
- Add HTTPS/TLS
- Environment variable protection
- SQL injection prevention (using parameterized queries)

## Monitoring and Logging

### Current State
- Basic print statements for debugging
- No structured logging

### Recommendations
- Implement structured logging (JSON format)
- Add request/response logging
- Error tracking (Sentry, etc.)
- Performance monitoring
- Health check endpoints

## Testing Strategy

### Unit Tests
- Test services independently
- Mock external dependencies
- Test data validation in models

### Integration Tests
- Test API endpoints
- Test database operations
- Test full request/response cycle

### End-to-End Tests
- Test complete user flows
- Test with real audio files
- Test error scenarios

## Deployment Architecture

### Development
```
localhost:8000 (Backend)
localhost:5173 (Frontend)
```

### Production Options

**Option 1: Monolithic**
```
nginx → FastAPI (Uvicorn)
      → Static files (React build)
```

**Option 2: Microservices**
```
API Gateway
  ├─► Transcription Service
  ├─► Analysis Service
  └─► Interview Management Service
```

**Option 3: Serverless**
```
Frontend: Vercel/Netlify
Backend: AWS Lambda + API Gateway
Database: RDS or DynamoDB
Storage: S3 for audio files
```

## Future Improvements

1. **Add Authentication**: User accounts and access control
2. **WebSocket Support**: Real-time collaboration on transcripts
3. **Cloud Storage**: Move audio files to S3/Cloudinary
4. **Batch Processing**: Queue system for multiple transcriptions
5. **Analytics**: Track usage and performance metrics
6. **Multi-tenancy**: Support for multiple organizations
7. **API Versioning**: `/api/v1/`, `/api/v2/`
8. **GraphQL**: Alternative to REST API
9. **Caching Layer**: Redis for performance
10. **CDN Integration**: Fast global content delivery

---

**Architecture Version**: 2.0  
**Last Updated**: November 2025  
**Status**: ✅ Production Ready

