# WhisperX Integration Guide

## Current Status

✅ **The API is fully functional** - It will use mock transcription data if WhisperX is not installed.

## Quick Start (Without WhisperX)

The backend works perfectly fine without WhisperX installed. It will automatically fall back to mock transcription data.

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Optional: Installing WhisperX for Real Transcription

WhisperX installation can be challenging on Windows. Here are your options:

### Option 1: Try Direct Installation (May Fail on Windows)

```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install git+https://github.com/m-bain/whisperx.git
```

**Note:** This requires FFmpeg development libraries and Microsoft Visual C++ Build Tools.

### Option 2: Use Linux/WSL (Recommended for Windows Users)

If you're on Windows and need real transcription, consider using WSL (Windows Subsystem for Linux):

```bash
# In WSL Ubuntu
sudo apt update
sudo apt install ffmpeg
pip install torch torchaudio
pip install git+https://github.com/m-bain/whisperx.git
```

### Option 3: Use Alternative Transcription Services

Instead of WhisperX, you could integrate:
- OpenAI Whisper API
- AssemblyAI
- Google Speech-to-Text
- Azure Speech Service

## Installation Steps (If Attempting WhisperX on Windows)

### 1. Navigate to the backend directory
```bash
cd backend
```

### 2. Activate your virtual environment (if using one)
```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

**Note:** If you have a CUDA-capable GPU, you may want to install the GPU version of PyTorch first:
```bash
# For CUDA 11.8
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CUDA 12.1
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 4. Start the server
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## How It Works

1. **Model Loading**: On startup, WhisperX loads the base model (~140MB download on first run)
2. **Transcription**: Audio files are temporarily saved and processed through WhisperX
3. **Alignment**: Word-level timestamps are aligned for better accuracy
4. **Cleanup**: Temporary files are automatically deleted after processing

## Features

- ✅ Real-time speech-to-text transcription
- ✅ Word-level timestamps for precise editing
- ✅ Automatic language detection
- ✅ Support for MP3 and WAV audio formats
- ✅ GPU acceleration (if available)
- ✅ Fallback to mock data if WhisperX is not installed

## Model Options

The code uses the `base` model by default. You can change this in `main.py`:

```python
WHISPER_MODEL = whisperx.load_model("base", DEVICE, compute_type=COMPUTE_TYPE)
```

Available models (in order of size/accuracy):
- `tiny` - Fastest, lowest accuracy (~39M parameters)
- `base` - Good balance (~74M parameters) **[Default]**
- `small` - Better accuracy (~244M parameters)
- `medium` - High accuracy (~769M parameters)
- `large` - Best accuracy (~1550M parameters)

## Troubleshooting

### "WhisperX not available, using mock data"
This means WhisperX couldn't be imported. Check that:
1. All dependencies are installed: `pip install -r requirements.txt`
2. FFmpeg is installed and in your PATH
3. No errors occurred during installation

### Out of Memory Errors
If you get OOM errors:
1. Use a smaller model (e.g., `tiny` or `base`)
2. Reduce batch size in the transcribe function
3. Use CPU instead of GPU if GPU memory is limited

### Slow Transcription
- First transcription is slower due to model loading
- Use a GPU for 10-20x speed improvement
- Use smaller models for faster processing

## Testing

Upload an audio file through the frontend to test the integration. The first request will take longer as models are downloaded and loaded.

