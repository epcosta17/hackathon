# AI Models and Prompts

This directory contains AI-related files for the B2B Talent Analysis App.

## Contents

- **`PROMPT_JSON.md`** - Structured prompts for Google Gemini API
- **`PROMPT.md`** - Natural language prompts
- **`RESPONSE.md`** - Response format documentation
- **`download-ggml-model.sh`** - Script to download Whisper model
- **`ggml-base.bin`** - Whisper transcription model (not in Git)

## Download the Whisper Model

The `ggml-base.bin` file (141 MB) is not included in the Git repository due to size constraints.

### First-time Setup

Run the download script to get the model:

```bash
cd backend/ai
./download-ggml-model.sh
```

This will download the base Whisper model from Hugging Face.

### Model File

- **Size**: ~141 MB
- **Model**: Whisper Base (English)
- **Format**: GGML (optimized for whisper.cpp)
- **Performance**: Fast transcription with good accuracy

### If Download Fails

You can manually download the model:

1. Visit: https://huggingface.co/ggerganov/whisper.cpp
2. Download `ggml-base.bin`
3. Place it in this directory: `backend/ai/ggml-base.bin`

## Why Not in Git?

GitHub has a 100 MB file size limit. The model file exceeds this limit, so:
- ✅ It's excluded via `.gitignore`
- ✅ Users download it locally using the script
- ✅ The download script IS included in Git

This keeps the repository small while ensuring everyone can get the model easily.

---

**Note**: The backend will use mock transcription data if the model file is not found, so the app still works without it for development purposes.

