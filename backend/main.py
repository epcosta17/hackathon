import time
import os
import tempfile
import uuid
from typing import Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

# WhisperX imports
try:
    import whisperx
    import torch
    WHISPERX_AVAILABLE = True
except ImportError:
    WHISPERX_AVAILABLE = False
    print("WARNING: WhisperX not installed. Using mock transcription.")

# --- 1. Pydantic Data Contracts (Translates App.tsx Interfaces) ---

class TranscriptBlock(BaseModel):
    """Data model for a single timestamped block of transcribed text."""
    id: str
    timestamp: float = Field(..., description="Start time in seconds.")
    duration: float
    text: str

class AnalysisData(BaseModel):
    """Data model for the structured AI analysis output."""
    model_config = ConfigDict(populate_by_name=True)
    
    best_fit_role: str = Field(..., serialization_alias="bestFitRole", description="The AI's suggested best-fit role.")
    communication_score: int = Field(..., serialization_alias="communicationScore", ge=0, le=100, description="Overall communication score.")
    technical_debt_risk: str = Field(..., serialization_alias="technicalDebtRisk", description="Risk assessment (Low, Medium, High).")
    soft_skill_summary: Dict[str, int] = Field(..., serialization_alias="softSkillSummary", description="Breakdown of soft skill scores.")
    full_analysis: Dict[str, List[str]] = Field(..., serialization_alias="fullAnalysis", description="Detailed strengths, weaknesses, and recommendations.")

# --- 2. FastAPI Setup ---

# Initialize the FastAPI app
app = FastAPI(
    title="Talent X-Ray API",
    description="Backend for AI-Powered Talent Analysis Hackathon Project",
    docs_url="/",
)

# Configure CORS (Crucial for FastAPI/Vite local development)
# Replace "*" with your specific frontend origin (e.g., "http://localhost:3000") in production.
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "*" # Using '*' for quick hackathon prototype
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. WhisperX Configuration ---

# Global variables for WhisperX model
WHISPER_MODEL = None
if WHISPERX_AVAILABLE:
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"
else:
    DEVICE = None
    COMPUTE_TYPE = None

def load_whisperx_model():
    """Load WhisperX model on startup."""
    global WHISPER_MODEL
    if WHISPERX_AVAILABLE and WHISPER_MODEL is None:
        print(f"Loading WhisperX model on device: {DEVICE}")
        WHISPER_MODEL = whisperx.load_model("base", DEVICE, compute_type=COMPUTE_TYPE)
        print("WhisperX model loaded successfully")

@app.on_event("startup")
async def startup_event():
    """Initialize WhisperX model when the app starts."""
    if WHISPERX_AVAILABLE:
        load_whisperx_model()

# --- 4. Transcription Functions ---

def transcribe_with_whisperx(audio_file_path: str) -> List[TranscriptBlock]:
    """
    Transcribe audio file using WhisperX with word-level timestamps.
    
    Args:
        audio_file_path: Path to the audio file
        
    Returns:
        List of TranscriptBlock objects with timestamps
    """
    if not WHISPERX_AVAILABLE or WHISPER_MODEL is None:
        raise HTTPException(status_code=500, detail="WhisperX is not available")
    
    try:
        # Load audio
        audio = whisperx.load_audio(audio_file_path)
        
        # Transcribe with WhisperX
        result = WHISPER_MODEL.transcribe(audio, batch_size=16)
        
        # Align whisper output
        model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=DEVICE)
        result = whisperx.align(result["segments"], model_a, metadata, audio, DEVICE, return_char_alignments=False)
        
        # Convert segments to TranscriptBlock format
        transcript_blocks = []
        for idx, segment in enumerate(result["segments"]):
            block = TranscriptBlock(
                id=str(uuid.uuid4()),
                timestamp=float(segment.get("start", 0.0)),
                duration=float(segment.get("end", 0.0) - segment.get("start", 0.0)),
                text=segment.get("text", "").strip()
            )
            transcript_blocks.append(block)
        
        return transcript_blocks
        
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

def generate_mock_transcript() -> List[TranscriptBlock]:
    """Simulates WhisperX output with word-aligned blocks."""
    data = [
        {'id': '1', 'timestamp': 0.0, 'duration': 12.0, 'text': "Hello, thank you for the opportunity to interview today. I'm really excited about this position."},
        {'id': '2', 'timestamp': 12.0, 'duration': 15.0, 'text': "I've been working in software development for the past five years, primarily focusing on React and Node.js applications."},
        {'id': '3', 'timestamp': 27.0, 'duration': 18.0, 'text': "In my current role, I lead a team of four developers. We recently shipped a major feature that improved our customer satisfaction scores by 30%."},
        {'id': '4', 'timestamp': 45.0, 'duration': 14.0, 'text': "One of the biggest challenges we faced was technical debt from legacy code. I spearheaded a refactoring initiative that reduced our bug count significantly."},
        {'id': '5', 'timestamp': 59.0, 'duration': 16.0, 'text': "I'm particularly interested in this role because of your company's focus on AI integration. I've been learning about machine learning models in my spare time."},
        {'id': '6', 'timestamp': 75.0, 'duration': 13.0, 'text': "Communication is something I value highly. I run weekly sync meetings and maintain detailed documentation for all our projects."},
        {'id': '7', 'timestamp': 88.0, 'duration': 11.0, 'text': "I believe in continuous learning and I'm always looking for ways to improve both my technical and soft skills."}
    ]
    return [TranscriptBlock(**block) for block in data]

def run_mock_ai_analysis(transcript_text: str) -> AnalysisData:
    """Simulates Cursor AI analysis and structured output generation."""
    
    # In a real app, this is where you call the LLM:
    # 1. Get JSON Schema: schema = AnalysisData.model_json_schema()
    # 2. Construct Prompt: prompt = f"Analyze this transcript against the Top Talent Pool criteria: {transcript_text}\nOutput in this JSON format: {schema}"
    # 3. Call LLM (using a library like 'instructor' for Pydantic enforcement or direct API call)
    
    # Simple logic to ensure the analysis changes slightly based on the text length
    word_count = len(transcript_text.split())
    
    # Generate mock analysis using the Pydantic model
    return AnalysisData(
        best_fit_role='Senior Full-Stack Developer',
        communication_score=87,
        technical_debt_risk='Low',
        soft_skill_summary={
            'leadership': 85,
            'collaboration': 90,
            'problemSolving': 82,
            'adaptability': 88
        },
        full_analysis={
            'strengths': [
                'Strong technical background in React and Node.js.',
                'Proven leadership skills managing a team of developers.',
                'Proactive approach to addressing technical debt.'
            ],
            'weaknesses': [
                'Limited production experience with AI/ML integration.',
                'May need mentorship in scaling applications.'
            ],
            'recommendations': [
                'Strong candidate for senior individual contributor or tech lead role.',
                'Provide opportunities for AI/ML learning and application.'
            ],
        },
    )

# --- 5. FastAPI Endpoints ---

@app.post("/api/transcribe", response_model=List[TranscriptBlock])
async def transcribe_endpoint(audio_file: UploadFile = File(...)):
    """
    ENDPOINT: Handles audio file upload and triggers real WhisperX transcription.
    
    The frontend (UploadScreen.tsx) will call this via fetch/axios.
    """
    if audio_file.content_type not in ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only MP3 and WAV supported.")
    
    # Create a temporary file to store the uploaded audio
    temp_file = None
    try:
        # Read the uploaded file content
        content = await audio_file.read()
        
        # Create a temporary file with the appropriate extension
        file_extension = ".mp3" if "mp3" in audio_file.content_type else ".wav"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        temp_file.write(content)
        temp_file.close()
        
        # If WhisperX is available, use it for transcription
        if WHISPERX_AVAILABLE:
            transcript_blocks = transcribe_with_whisperx(temp_file.name)
        else:
            # Fall back to mock data if WhisperX is not available
            print("WhisperX not available, using mock data")
            time.sleep(2)  # Simulate transcription time
            transcript_blocks = generate_mock_transcript()
        
        return transcript_blocks
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing audio file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception as e:
                print(f"Error deleting temp file: {str(e)}")


@app.post("/api/analyze", response_model=AnalysisData)
async def analyze_endpoint(transcript_text: str = Form(...)):
    """
    ENDPOINT: Takes the final, edited transcript text and returns the AI analysis.
    
    The frontend (TranscriptEditor.tsx) will call this after edits.
    """
    if not transcript_text:
        raise HTTPException(status_code=400, detail="Transcript text is required for analysis.")
    
    # --- PROTOTYPE MOCK LOGIC ---
    time.sleep(1.5) # Simulate AI analysis time

    # Run the mock AI logic which returns a validated AnalysisData object
    analysis_data = run_mock_ai_analysis(transcript_text)
    
    # FastAPI automatically serializes the Pydantic model to JSON
    return analysis_data


@app.get("/api/ping")
async def ping():
    """Simple endpoint to check API health."""
    return {"message": "pong"}

# --- 6. Uvicorn Runner (for local execution) ---

if __name__ == "__main__":
    import uvicorn
    # Run the API on a separate port (e.g., 8000) from your Vite frontend (e.g., 3000)
    uvicorn.run(app, host="0.0.0.0", port=8000)