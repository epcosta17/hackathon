import time
import os
import tempfile
import uuid
import subprocess
import re
from typing import Dict, List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Transcription imports
try:
    import whisperx
    import torch
    WHISPERX_AVAILABLE = True
except ImportError:
    WHISPERX_AVAILABLE = False
    print("WARNING: WhisperX not installed.")

# OpenAI Whisper API
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("WARNING: OpenAI not installed. Run: pip install openai")

# --- 1. Pydantic Data Contracts ---

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

app = FastAPI(
    title="Talent X-Ray API",
    description="Backend for AI-Powered Talent Analysis Hackathon Project",
    docs_url="/",
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. WhisperX Configuration ---

WHISPER_MODEL = None
if WHISPERX_AVAILABLE:
    if torch.cuda.is_available():
        DEVICE = "cuda"
        COMPUTE_TYPE = "float16"
    else:
        DEVICE = "cpu"
        COMPUTE_TYPE = "float32" if torch.backends.mps.is_available() else "int8"
else:
    DEVICE = None
    COMPUTE_TYPE = None

def load_whisperx_model():
    """Load WhisperX model on startup."""
    global WHISPER_MODEL
    if WHISPERX_AVAILABLE and WHISPER_MODEL is None:
        WHISPER_MODEL = whisperx.load_model("base", DEVICE, compute_type=COMPUTE_TYPE)

@app.on_event("startup")
async def startup_event():
    """Initialize WhisperX model when the app starts."""
    if WHISPERX_AVAILABLE:
        load_whisperx_model()

# --- 4. Transcription Functions ---

async def transcribe_with_whisperx_progress(audio_file_path: str, progress_callback=None):
    """
    Transcribe audio file using WhisperX with word-level timestamps and progress updates.
    """
    if not WHISPERX_AVAILABLE or WHISPER_MODEL is None:
        raise HTTPException(status_code=500, detail="WhisperX is not available")
    
    try:
        if progress_callback:
            await progress_callback(10, "Loading audio file...")
        
        audio = whisperx.load_audio(audio_file_path)
        
        if progress_callback:
            await progress_callback(25, "Transcribing with WhisperX...")
        
        result = WHISPER_MODEL.transcribe(audio, batch_size=16)
        
        if progress_callback:
            await progress_callback(60, f"Aligning timestamps for {result.get('language', 'unknown')} language...")
        
        model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=DEVICE)
        result = whisperx.align(result["segments"], model_a, metadata, audio, DEVICE, return_char_alignments=False)
        
        if progress_callback:
            await progress_callback(80, "Converting to transcript blocks...")
        
        transcript_blocks = []
        total_segments = len(result["segments"])
        for idx, segment in enumerate(result["segments"]):
            block = TranscriptBlock(
                id=str(uuid.uuid4()),
                timestamp=float(segment.get("start", 0.0)),
                duration=float(segment.get("end", 0.0) - segment.get("start", 0.0)),
                text=segment.get("text", "").strip()
            )
            transcript_blocks.append(block)
            
            if progress_callback and (idx + 1) % 5 == 0:
                progress = 80 + int((idx + 1) / total_segments * 15)
                await progress_callback(progress, f"Processing segments... {idx + 1}/{total_segments}")
        
        if progress_callback:
            await progress_callback(95, "Finalizing...")
        
        return transcript_blocks
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

async def transcribe_with_whisper_cpp(audio_file_path: str, progress_queue=None) -> List[TranscriptBlock]:
    """
    Transcribe audio using whisper.cpp (local, FREE, Metal-accelerated on Apple Silicon)
    """
    whisper_binary = "/opt/homebrew/bin/whisper-cli"
    model_path = os.path.join(os.path.dirname(__file__), "models", "ggml-base.bin")
    
    if not os.path.exists(whisper_binary):
        raise HTTPException(status_code=500, detail="whisper.cpp not installed. Run: brew install whisper-cpp")
    
    if not os.path.exists(model_path):
        raise HTTPException(status_code=500, detail=f"Model not found at {model_path}. Download from huggingface.")
    
    try:
        cmd = [
            whisper_binary,
            "-m", model_path,
            "-t", "4",
            "-ml", "80",
            "-l", "auto",
            "-pp",
            "-f", audio_file_path,
        ]
        
        loop = asyncio.get_event_loop()
        
        def run_with_progress():
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            stderr_output = []
            stdout_output = []
            
            while True:
                if process.poll() is not None:
                    break
                
                if process.stderr:
                    line = process.stderr.readline()
                    if line:
                        stderr_output.append(line)
                        if "progress" in line.lower() and "%" in line:
                            try:
                                match = re.search(r'(\d+)%', line)
                                if match:
                                    progress = int(match.group(1))
                                    scaled_progress = 10 + int(progress * 0.7)
                                    if progress_queue:
                                        try:
                                            asyncio.run_coroutine_threadsafe(
                                                progress_queue.put((scaled_progress, f'Transcribing... {progress}%')),
                                                loop
                                            )
                                        except:
                                            pass
                            except:
                                pass
            
            remaining_stderr = process.stderr.read() if process.stderr else ""
            remaining_stdout = process.stdout.read() if process.stdout else ""
            
            stderr_output.append(remaining_stderr)
            stdout_output.append(remaining_stdout)
            
            returncode = process.wait()
            
            return {
                'returncode': returncode,
                'stdout': ''.join(stdout_output),
                'stderr': ''.join(stderr_output)
            }
        
        result_dict = await loop.run_in_executor(None, run_with_progress)
        
        if result_dict['returncode'] != 0:
            raise subprocess.CalledProcessError(
                result_dict['returncode'],
                cmd,
                result_dict['stdout'],
                result_dict['stderr']
            )
        
        transcript_blocks = []
        lines = result_dict['stdout'].strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('whisper_'):
                continue
            
            if line.startswith('[') and ']' in line:
                try:
                    timestamp_part, text = line.split(']', 1)
                    timestamp_part = timestamp_part.strip('[]')
                    
                    if '-->' in timestamp_part:
                        start_time_str, end_time_str = timestamp_part.split('-->')
                        start_time_str = start_time_str.strip()
                        end_time_str = end_time_str.strip()
                        
                        def time_to_seconds(time_str):
                            parts = time_str.split(':')
                            hours = int(parts[0])
                            minutes = int(parts[1])
                            seconds = float(parts[2])
                            return hours * 3600 + minutes * 60 + seconds
                        
                        start_seconds = time_to_seconds(start_time_str)
                        end_seconds = time_to_seconds(end_time_str)
                        
                        block = TranscriptBlock(
                            id=str(uuid.uuid4()),
                            timestamp=start_seconds,
                            duration=end_seconds - start_seconds,
                            text=text.strip()
                        )
                        transcript_blocks.append(block)
                except:
                    continue
        
        if not transcript_blocks:
            full_text = result_dict['stdout'].strip()
            if full_text:
                block = TranscriptBlock(
                    id=str(uuid.uuid4()),
                    timestamp=0.0,
                    duration=0.0,
                    text=full_text
                )
                transcript_blocks.append(block)
        
        return transcript_blocks
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"whisper.cpp failed: {e.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

async def transcribe_with_openai(audio_file_path: str) -> List[TranscriptBlock]:
    """
    Transcribe audio using OpenAI Whisper API.
    """
    if not OPENAI_AVAILABLE:
        raise HTTPException(status_code=500, detail="OpenAI client not installed")
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail="OPENAI_API_KEY not found. Set it in environment or .env file"
        )
    
    try:
        client = OpenAI(api_key=api_key)
        
        with open(audio_file_path, "rb") as audio_file:
            transcript = await asyncio.to_thread(
                client.audio.transcriptions.create,
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        
        transcript_blocks = []
        
        if hasattr(transcript, 'words') and transcript.words:
            current_block_words = []
            current_start = None
            
            for word_data in transcript.words:
                if current_start is None:
                    current_start = word_data.start
                
                current_block_words.append(word_data.word)
                
                if len(current_block_words) >= 10 or word_data.word.rstrip().endswith(('.', '!', '?', ',')):
                    block = TranscriptBlock(
                        id=str(uuid.uuid4()),
                        timestamp=float(current_start),
                        duration=float(word_data.end - current_start),
                        text=' '.join(current_block_words).strip()
                    )
                    transcript_blocks.append(block)
                    current_block_words = []
                    current_start = None
            
            if current_block_words and current_start is not None:
                last_word = transcript.words[-1]
                block = TranscriptBlock(
                    id=str(uuid.uuid4()),
                    timestamp=float(current_start),
                    duration=float(last_word.end - current_start),
                    text=' '.join(current_block_words).strip()
                )
                transcript_blocks.append(block)
        else:
            block = TranscriptBlock(
                id=str(uuid.uuid4()),
                timestamp=0.0,
                duration=float(getattr(transcript, 'duration', 0)),
                text=transcript.text
            )
            transcript_blocks.append(block)
        
        return transcript_blocks
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI transcription failed: {str(e)}")

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
    """Simulates AI analysis and structured output generation."""
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

@app.post("/api/transcribe-stream")
async def transcribe_stream_endpoint(audio_file: UploadFile = File(...)):
    """
    Handles audio file upload and streams progress updates via Server-Sent Events.
    """
    if audio_file.content_type not in ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only MP3 and WAV supported.")
    
    file_content = await audio_file.read()
    file_extension = ".mp3" if "mp3" in audio_file.content_type else ".wav"
    
    async def event_generator():
        temp_file = None
        try:
            yield f"data: {json.dumps({'progress': 5, 'message': 'Uploading file...'})}\n\n"
            await asyncio.sleep(0.1)
            
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
            temp_file.write(file_content)
            temp_file.close()
            
            # Priority: whisper.cpp (FREE!) > WhisperX Local > OpenAI API > Mock Data
            if os.path.exists("/opt/homebrew/bin/whisper-cli"):
                yield f"data: {json.dumps({'progress': 10, 'message': 'Transcribing with whisper.cpp (FREE!)...'})}\n\n"
                await asyncio.sleep(0.1)
                
                progress_queue = asyncio.Queue()
                transcription_task = asyncio.create_task(
                    transcribe_with_whisper_cpp(temp_file.name, progress_queue)
                )
                
                last_progress = 10
                while not transcription_task.done():
                    try:
                        progress_pct, message = await asyncio.wait_for(
                            progress_queue.get(),
                            timeout=0.5
                        )
                        if progress_pct > last_progress:
                            last_progress = progress_pct
                            yield f"data: {json.dumps({'progress': progress_pct, 'message': message})}\n\n"
                    except asyncio.TimeoutError:
                        pass
                
                transcript_blocks = await transcription_task
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"
                await asyncio.sleep(0.1)
                
            elif OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
                yield f"data: {json.dumps({'progress': 10, 'message': 'Transcribing with OpenAI Whisper API...'})}\n\n"
                await asyncio.sleep(0.1)
                
                transcript_blocks = await transcribe_with_openai(temp_file.name)
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"
                await asyncio.sleep(0.1)
                
            elif WHISPERX_AVAILABLE:
                yield f"data: {json.dumps({'progress': 10, 'message': 'Loading audio file...'})}\n\n"
                await asyncio.sleep(0.1)
                
                loop = asyncio.get_event_loop()
                with ThreadPoolExecutor() as executor:
                    audio = await loop.run_in_executor(executor, whisperx.load_audio, temp_file.name)
                    
                    yield f"data: {json.dumps({'progress': 25, 'message': 'Transcribing with WhisperX...'})}\n\n"
                    await asyncio.sleep(0.1)
                    
                    result = await loop.run_in_executor(
                        executor,
                        lambda: WHISPER_MODEL.transcribe(audio, batch_size=16)
                    )
                    
                    yield f"data: {json.dumps({'progress': 60, 'message': f'Aligning timestamps ({result.get('language', 'unknown')})...'})}\n\n"
                    await asyncio.sleep(0.1)
                    
                    model_a, metadata = await loop.run_in_executor(
                        executor,
                        lambda: whisperx.load_align_model(language_code=result["language"], device=DEVICE)
                    )
                    result = await loop.run_in_executor(
                        executor,
                        lambda: whisperx.align(result["segments"], model_a, metadata, audio, DEVICE, return_char_alignments=False)
                    )
                    
                    yield f"data: {json.dumps({'progress': 80, 'message': 'Converting segments...'})}\n\n"
                    await asyncio.sleep(0.1)
                
                transcript_blocks = []
                total_segments = len(result["segments"])
                for idx, segment in enumerate(result["segments"]):
                    block = TranscriptBlock(
                        id=str(uuid.uuid4()),
                        timestamp=float(segment.get("start", 0.0)),
                        duration=float(segment.get("end", 0.0) - segment.get("start", 0.0)),
                        text=segment.get("text", "").strip()
                    )
                    transcript_blocks.append(block)
                    
                    if (idx + 1) % 5 == 0:
                        progress = 80 + int((idx + 1) / total_segments * 15)
                        yield f"data: {json.dumps({'progress': progress, 'message': f'Processing {idx + 1}/{total_segments} segments...'})}\n\n"
                        await asyncio.sleep(0.05)
            else:
                yield f"data: {json.dumps({'progress': 50, 'message': 'Using mock data...'})}\n\n"
                await asyncio.sleep(1)
                transcript_blocks = generate_mock_transcript()
            
            yield f"data: {json.dumps({'progress': 100, 'message': 'Complete!', 'transcript': [block.model_dump() for block in transcript_blocks]})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except:
                    pass
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/analyze", response_model=AnalysisData)
async def analyze_endpoint(transcript_text: str = Form(...)):
    """
    Takes the final, edited transcript text and returns the AI analysis.
    """
    if not transcript_text:
        raise HTTPException(status_code=400, detail="Transcript text is required for analysis.")
    
    time.sleep(1.5)  # Simulate AI analysis time
    analysis_data = run_mock_ai_analysis(transcript_text)
    
    return analysis_data

@app.get("/api/ping")
async def ping():
    """Simple endpoint to check API health."""
    return {"message": "pong"}

# --- 6. Uvicorn Runner ---

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
