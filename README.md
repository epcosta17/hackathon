# B2B AI Talent Analysis App

An intelligent application for analyzing talent through interview transcripts. Upload audio interviews, get AI-powered transcriptions, and receive detailed analysis of candidate skills, communication abilities, and potential.

## 🚀 Quick Start (macOS)

### Prerequisites

1. **Homebrew** - macOS package manager
   ```bash
   # Install Homebrew if not already installed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Python 3.8+**
   ```bash
   brew install python3
   python3 --version
   ```

3. **Node.js 16+**
   ```bash
   brew install node
   node --version
   ```

### Installation

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will be available at `http://127.0.0.1:8000`

#### 2. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm i

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 📋 Features

- 🎤 **Audio Upload**: Support for MP3 and WAV files
- 📝 **Smart Transcription**: Automatic speech-to-text with word-level timestamps
- ✏️ **Interactive Editor**: Edit transcripts with precision
- 🤖 **AI Analysis**: Comprehensive talent assessment including:
  - Technical skills evaluation
  - Communication analysis
  - Problem-solving assessment
  - Cultural fit indicators
  - Hiring recommendations
- 📊 **Beautiful Dashboards**: Modern UI with detailed visualizations

## 🏗️ Project Structure

```
hackathon/
├── backend/                      # Python FastAPI backend
│   ├── main.py                  # API endpoints and logic
│   ├── requirements.txt         # Python dependencies
│   ├── WHISPERX_SETUP.md       # WhisperX installation guide
│   └── INTEGRATION_COMPLETE.md # Integration documentation
│
└── frontend/                    # React TypeScript frontend
    ├── src/
    │   ├── components/         # React components
    │   │   ├── UploadScreen.tsx
    │   │   ├── TranscriptEditor.tsx
    │   │   └── AnalysisDashboard.tsx
    │   └── App.tsx            # Main application
    ├── package.json
    └── README.md
```

## 🔧 Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **WhisperX** - Advanced speech recognition (optional)
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library

## 🎯 Optional: WhisperX Installation

The app works with mock transcription data by default. For real transcription:

```bash
# Install FFmpeg
brew install ffmpeg

# Activate your virtual environment
cd backend
source .venv/bin/activate

# Install PyTorch (MPS acceleration on Apple Silicon)
pip install torch torchaudio

# Install WhisperX
pip install git+https://github.com/m-bain/whisperx.git

# Restart the backend server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### macOS Performance

- **Apple Silicon (M1/M2/M3)**: Automatic GPU acceleration via Metal Performance Shaders (MPS)
- **Intel Macs**: CPU-based processing (still fast for smaller models)

See `backend/WHISPERX_SETUP.md` for detailed instructions.

## 🧪 Testing the Application

1. **Start both servers** (backend and frontend)
2. **Open your browser** to `http://localhost:5173`
3. **Upload an audio file** (MP3 or WAV)
4. **View the transcript** in the editor
5. **Run analysis** to get AI insights
6. **Review results** in the dashboard

## 📖 API Documentation

Once the backend is running, visit:
- **Interactive API docs**: `http://127.0.0.1:8000/docs`
- **Alternative docs**: `http://127.0.0.1:8000/redoc`

### Key Endpoints

- `GET /api/ping` - Health check
- `POST /api/transcribe` - Upload audio for transcription
- `POST /api/analyze` - Analyze transcript and get insights

## 🐛 Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Find and kill the process
lsof -ti:8000 | xargs kill -9

# Or use a different port
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

**WhisperX import errors:**
```bash
# Verify FFmpeg installation
which ffmpeg
ffmpeg -version

# Reinstall WhisperX
pip uninstall whisperx
pip install git+https://github.com/m-bain/whisperx.git
```

### Frontend Issues

**Port 5173 already in use:**
- Vite will automatically use the next available port
- Check terminal output for the actual URL

**Module not found errors:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm i
```

**Cannot connect to backend:**
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify API URL in network requests

## 🚀 Deployment

### Backend
```bash
cd backend
pip install -r requirements.txt

# For production, use gunicorn or similar
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run build

# Deploy the dist/ directory to your hosting service
# (Netlify, Vercel, AWS S3, etc.)
```

## 📝 Development Tips

### Backend Development
- Use `--reload` flag for auto-reload during development
- Check logs in terminal for debugging
- Test endpoints with the interactive docs at `/docs`

### Frontend Development
- Hot reload is enabled by default with Vite
- Use React DevTools for component debugging
- Check browser console for errors

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

See individual component licenses for details.

## 🔗 Links

- **Original Design**: [Figma](https://www.figma.com/design/oHlArZbdYorZZ6YhZPB9Tu/B2B-AI-Talent-Analysis-App)
- **WhisperX**: [GitHub](https://github.com/m-bain/whisperx)
- **FastAPI**: [Documentation](https://fastapi.tiangolo.com/)
- **React**: [Documentation](https://react.dev/)

## 💡 Support

For detailed setup instructions:
- Backend: See `backend/WHISPERX_SETUP.md`
- Frontend: See `frontend/README.md`
- Integration: See `backend/INTEGRATION_COMPLETE.md`

---

**Built with ❤️ for macOS**

