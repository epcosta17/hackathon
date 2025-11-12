# WhisperX Integration Guide (macOS)

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

WhisperX works well on macOS. Here are your options:

### Option 1: Direct Installation on macOS (Recommended)

```bash
# Install FFmpeg using Homebrew
brew install ffmpeg

# Install PyTorch (CPU or MPS for Apple Silicon)
pip install torch torchaudio

# Install WhisperX
pip install git+https://github.com/m-bain/whisperx.git
```

**Note:** On Apple Silicon Macs (M1/M2/M3), PyTorch will automatically use the Metal Performance Shaders (MPS) backend for GPU acceleration.

### Option 2: Use Alternative Transcription Services

Instead of WhisperX, you could integrate:
- OpenAI Whisper API
- AssemblyAI
- Google Speech-to-Text
- Azure Speech Service

## Installation Steps for WhisperX on macOS

### 1. Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install FFmpeg
```bash
brew install ffmpeg
```

### 3. Navigate to the backend directory
```bash
cd backend
```

### 4. Activate your virtual environment (if using one)
```bash
source .venv/bin/activate
```

### 5. Install PyTorch
```bash
# For Apple Silicon (M1/M2/M3) - automatically uses MPS acceleration
pip install torch torchaudio

# For Intel Macs - CPU only
pip install torch torchaudio
```

### 6. Install dependencies
```bash
pip install -r requirements.txt
```

### 7. Install WhisperX
```bash
pip install git+https://github.com/m-bain/whisperx.git
```

### 8. Start the server
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
- ✅ MPS acceleration on Apple Silicon (M1/M2/M3)
- ✅ Fallback to mock data if WhisperX is not installed

## Performance on Apple Silicon

Apple Silicon Macs (M1/M2/M3) provide excellent performance for WhisperX:
- **MPS Backend**: PyTorch automatically uses Metal Performance Shaders for GPU acceleration
- **Unified Memory**: Efficient memory usage across CPU and GPU
- **Performance**: Comparable to NVIDIA GPUs for inference tasks

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
1. FFmpeg is installed: `brew list ffmpeg`
2. All dependencies are installed: `pip install -r requirements.txt`
3. WhisperX is installed: `pip show whisperx`
4. No errors occurred during installation

### Out of Memory Errors
If you get OOM errors (rare on Apple Silicon):
1. Use a smaller model (e.g., `tiny` or `base`)
2. Reduce batch size in the transcribe function
3. Close other applications to free up memory

### Slow Transcription
- First transcription is slower due to model loading
- Apple Silicon Macs should provide fast transcription with MPS
- Use smaller models for faster processing if needed

### FFmpeg Not Found
If you see FFmpeg errors:
```bash
# Check if FFmpeg is installed
which ffmpeg

# If not installed, install with Homebrew
brew install ffmpeg

# Verify installation
ffmpeg -version
```

## Testing

Upload an audio file through the frontend to test the integration. The first request will take longer as models are downloaded and loaded.


