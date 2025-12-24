# Backend - AI Interview Analysis Platform

FastAPI backend for AI-powered interview analysis with local transcription (Deepgram/Whisper), Google Gemini integration, and automated report generation. Validated for high-scale asynchronous processing using Google Cloud Tasks and Firestore.

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- **Google Cloud Project** with Firestore, Cloud Tasks, and Vertex AI enabled.
- **Deepgram API Key** (for production-grade transcription).
- whisper.cpp (`brew install whisper-cpp`) - *Optional local fallback*

### Installation

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Download Whisper model (only needed if using local fallback)
cd ai
./download-ggml-model.sh
cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your keys:
# GEMINI_API_KEY=...
# DEEPGRAM_API_KEY=...
# GOOGLE_APPLICATION_CREDENTIALS=path/to/creds.json
```

### Running the Server

```bash
# Development mode
python main.py

# Production (using uvicorn directly)
uvicorn main:app --host 0.0.0.0 --port 8000
```

Server will start at `http://127.0.0.1:8000`
API documentation: `http://127.0.0.1:8000/`

## 📁 Project Structure

```
backend/
├── main.py                    # FastAPI app entry point
├── database.py                # Firestore database connection & operations
├── models/
├── services/
│   ├── transcription_service.py   # Deepgram & Whisper logic
│   ├── analysis_service.py        # Gemini analysis logic
│   ├── storage_service.py         # GCS file operations
│   ├── task_service.py            # Cloud Tasks queueing
│   └── docx_service.py            # Report generation
├── routes/
│   ├── webhooks.py           # Async worker endpoints (Cloud Tasks)
│   ├── transcription.py      # Transcription endpoints
│   ├── analysis.py           # Analysis endpoints
│   └── interviews.py         # CRUD endpoints
```

## 🔌 API Endpoints

### Async Pipeline (Webhooks)
- `POST /v1/analyze-async` - Queue a full analysis job (Upload -> GCS -> Cloud Task -> Webhook)
- `POST /v1/tasks/process-audio` - Worker endpoint processed by Cloud Tasks.

### Transcription & Analysis
- `POST /v1/transcribe-stream` - Real-time SSE stream (Local dev flow)
- `POST /v1/analyze` - Generate AI analysis from transcript
- `GET /v1/audio/{filename}` - Stream audio with Range support

### Interviews & Data
- `GET /v1/interviews` - List interviews
- `GET /v1/interviews/{id}` - Get full interview details
- `POST /v1/interviews` - Save interview metadata
- `DELETE /v1/interviews/{id}` - Delete interview and resources

## 🛠️ Architecture

### Asynchronous Processing Pipeline
For production robustness, the app uses an async pipeline:
1. **Upload**: Client uploads audio to `analyze-async`.
2. **Queue**: Audio stored in GCS, task queued in Cloud Tasks.
3. **Process**: Cloud Task calls `/v1/tasks/process-audio`.
   - Downloads from GCS.
   - Transcribes (Deepgram).
   - Analyzes (Gemini).
   - Generates Waveform.
4. **Save**: Results saved to **Firestore**.
5. **Notify**: Webhook sent back to client/frontend.

### Components
- **Database**: Google Firestore (NoSQL Document Store).
- **Storage**: Google Cloud Storage (Audio files).
- **Compute**: Cloud Run (Containerized Backend).
- **AI**: Vertex AI (Gemini 2.5) & Deepgram Nova-3.

## 📊 Database Schema (Firestore)

**Collection: `users/{userId}/interviews`**
- Documents contain metadata (`title`, `status`, `created_at`).

**Sub-collections:**
- `data/transcript`: Stores full word-level transcript.
- `data/analysis`: Stores AI analysis JSON.
- `data/waveform`: Stores pre-computed waveform array.
- `notes/{noteId}`: User notes and bookmarks.

## 🔑 Environment Variables

```env
# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=service-account.json
GCS_BUCKET_NAME=your-bucket
GCS_PROJECT_ID=your-project

# AI Services
GEMINI_API_KEY=...
DEEPGRAM_API_KEY=...

# App Config
WEBHOOK_SECRET=...
```

## 🚢 Deployment

### Docker
```bash
docker build -t interviewlens-backend .
docker run -p 8000:8000 --env-file .env interviewlens-backend
```

### Google Cloud Run
The app is optimized for Cloud Run. Ensure your Service Account has permissions for Firestore, Storage, and Cloud Tasks.
