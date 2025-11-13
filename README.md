# B2B AI Talent Analysis App

An intelligent application for analyzing talent through interview transcripts. Upload audio interviews, get AI-powered transcriptions with timestamps, and receive comprehensive analysis of candidate skills, communication abilities, and technical competencies.

## ✨ Features

- 🎤 **Audio Upload** - Support for MP3 and WAV files up to 100MB
- 📝 **Smart Transcription** - Automatic speech-to-text with word-level timestamps using whisper.cpp
- ✏️ **Interactive Editor** - Edit transcripts with precision, add notes and bookmarks
- 🤖 **AI Analysis** - Comprehensive talent assessment powered by Google Gemini:
  - Technical skills evaluation
  - Communication and attitude analysis
  - Coding challenge insights
  - Key technical emphasis points
  - Interview statistics and metrics
- 📊 **Beautiful Dashboards** - Modern UI with detailed visualizations
- 💾 **Interview Management** - Save, search, and revisit past interviews
- 📄 **Report Generation** - Download detailed analysis reports as DOCX files

## 🚀 Quick Start

### Prerequisites

1. **Homebrew** (macOS package manager)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Python 3.12+**
   ```bash
   brew install python3
   python3 --version
   ```

3. **Node.js 18+**
   ```bash
   brew install node
   node --version
   ```

4. **whisper.cpp** (for local transcription)
   ```bash
   brew install whisper-cpp
   ```

### Installation

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download Whisper model (only needed once)
cd ai
./download-ggml-model.sh
cd ..

# Optional: Add Google Gemini API key for AI analysis
# Create a .env file in the backend directory:
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the backend server
python main.py
```

The backend will be available at `http://127.0.0.1:8000`

Interactive API docs: `http://127.0.0.1:8000/`

#### 2. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
hackathon/
├── backend/                      # Python FastAPI backend
│   ├── main.py                  # Application entry point
│   ├── database.py              # SQLite database operations
│   ├── models/
│   │   └── schemas.py          # Pydantic data models
│   ├── services/
│   │   ├── transcription_service.py  # Audio transcription
│   │   ├── analysis_service.py       # AI analysis
│   │   └── docx_service.py          # Report generation
│   ├── routes/
│   │   ├── transcription.py    # Transcription endpoints
│   │   ├── analysis.py         # Analysis endpoints
│   │   ├── interviews.py       # Interview CRUD
│   │   └── notes.py            # Notes & bookmarks
│   ├── ai/
│   │   ├── ggml-base.bin      # Whisper model
│   │   └── PROMPT_JSON.md     # AI prompts
│   └── requirements.txt
│
└── frontend/                    # React TypeScript frontend
    ├── src/
    │   ├── components/
    │   │   ├── UploadScreen.tsx
    │   │   ├── TranscriptEditor.tsx
    │   │   └── AnalysisDashboard.tsx
    │   └── App.tsx
    ├── package.json
    └── vite.config.ts
```

## 🔧 Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **whisper.cpp** - Fast, local speech recognition (Metal-accelerated on Apple Silicon)
- **Google Gemini** - AI-powered interview analysis
- **SQLite** - Local database for interviews and notes
- **python-docx** - Report generation
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful component library
- **Framer Motion** - Smooth animations

## 🎯 Usage

1. **Start both servers** (backend and frontend in separate terminals)
2. **Open your browser** to `http://localhost:5173`
3. **Upload an audio file** (MP3 or WAV) of an interview
4. **Review the transcript** - Edit, add notes, or bookmark important moments
5. **Run AI analysis** - Get comprehensive insights
6. **Save the interview** - Access it anytime from "Previous Interviews"
7. **Download report** - Export analysis as a Word document

## 📖 API Documentation

Once the backend is running, visit:
- **Interactive API docs**: `http://127.0.0.1:8000/`
- **Alternative docs**: `http://127.0.0.1:8000/redoc`

### Key Endpoints

- `GET /api/ping` - Health check
- `POST /api/transcribe-stream` - Upload audio for transcription (SSE stream)
- `POST /api/analyze` - Analyze transcript with AI
- `POST /api/interviews` - Save interview with notes
- `GET /api/interviews` - List and search interviews
- `POST /api/download-report` - Download DOCX report

## 🐛 Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
lsof -ti:8000 | xargs kill -9
```

**whisper.cpp not found:**
```bash
brew install whisper-cpp
```

**Model not found:**
```bash
cd backend/ai
./download-ggml-model.sh
```

**Python dependencies issues:**
```bash
cd backend
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend Issues

**Port 5173 already in use:**
- Vite will automatically use the next available port
- Check terminal output for the actual URL

**Module not found errors:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Cannot connect to backend:**
- Ensure backend is running on port 8000
- Check browser console for errors
- Verify both servers are running

## 🚢 Deployment

### Backend
```bash
cd backend
pip install -r requirements.txt

# For production, use a production ASGI server
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run build

# Deploy the dist/ directory to your hosting service
# (Vercel, Netlify, AWS S3, etc.)
```

## 💡 Performance Notes

### Apple Silicon (M1/M2/M3/M4)
- whisper.cpp automatically uses Metal for GPU acceleration
- Transcription is significantly faster than real-time
- No additional configuration needed

### Intel Macs
- CPU-based processing
- Still fast for the base model
- Consider using smaller audio files for best performance

## 🔗 Links

- **Original Design**: [Figma](https://www.figma.com/design/oHlArZbdYorZZ6YhZPB9Tu/B2B-AI-Talent-Analysis-App)
- **whisper.cpp**: [GitHub](https://github.com/ggerganov/whisper.cpp)
- **FastAPI**: [Documentation](https://fastapi.tiangolo.com/)
- **React**: [Documentation](https://react.dev/)

## 📄 License

MIT License - See individual component licenses for details.

---

**Built with ❤️ for intelligent talent analysis**
