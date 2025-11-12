# API Setup Instructions

## Setting up AI Analysis with Google Gemini

The system uses **Google Gemini API** for AI-powered interview analysis.

### Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API key" or "Create API key"
4. Copy your API key

### Setting Up the API Key

Create or update `backend/llm/.env`:

```bash
cd backend/llm
touch .env
```

Add your API key to the `.env` file:

```
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Restart the Backend Server

Stop the backend server (Ctrl+C) and start it again:

```bash
cd backend
python main.py
```

### 4. Verify Setup

When you run an analysis, you should see:
- `🤖 Using Claude API for analysis...`
- `✅ Claude analysis complete!`

If the API key is not set, you'll see:
- `⚠️ ANTHROPIC_API_KEY not found in environment variables`
- `📋 Using mock analysis data...`

## Cost Information

- Claude 3.5 Sonnet pricing: https://www.anthropic.com/pricing
- Typical interview analysis: ~3000-5000 tokens input, ~2000-4000 tokens output
- Estimated cost per analysis: $0.05 - $0.15

## Optional: OpenAI API

If you want to use OpenAI Whisper for cloud transcription (instead of local whisper.cpp), add:

```
OPENAI_API_KEY=sk-your-openai-key-here
```

## Security Notes

⚠️ **Never commit your `.env` file to git!**
- The `.env` file is already in `.gitignore`
- Never share your API keys publicly
- Rotate your keys if they're accidentally exposed

