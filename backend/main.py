import time
import os
import tempfile
import uuid
import subprocess
import re
from typing import Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

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
    # Check for CUDA GPU, otherwise use CPU
    # Note: WhisperX/ctranslate2 doesn't support MPS directly, but CPU on Apple Silicon is still fast
    if torch.cuda.is_available():
        DEVICE = "cuda"
        COMPUTE_TYPE = "float16"
    else:
        DEVICE = "cpu"
        # Use float32 for better performance on Apple Silicon
        COMPUTE_TYPE = "float32" if torch.backends.mps.is_available() else "int8"
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

async def transcribe_with_whisperx_progress(audio_file_path: str, progress_callback=None):
    """
    Transcribe audio file using WhisperX with word-level timestamps and progress updates.
    
    Args:
        audio_file_path: Path to the audio file
        progress_callback: Optional callback function to report progress
        
    Returns:
        List of TranscriptBlock objects with timestamps
    """
    if not WHISPERX_AVAILABLE or WHISPER_MODEL is None:
        raise HTTPException(status_code=500, detail="WhisperX is not available")
    
    try:
        if progress_callback:
            await progress_callback(10, "Loading audio file...")
        print("📊 [1/4] Loading audio file...")
        # Load audio
        audio = whisperx.load_audio(audio_file_path)
        print(f"✅ Audio loaded: {len(audio)/16000:.2f} seconds")
        
        if progress_callback:
            await progress_callback(25, "Transcribing with WhisperX...")
        print("📊 [2/4] Transcribing with WhisperX...")
        # Transcribe with WhisperX
        result = WHISPER_MODEL.transcribe(audio, batch_size=16)
        print(f"✅ Transcription complete! Detected language: {result.get('language', 'unknown')}")
        print(f"   Found {len(result.get('segments', []))} segments")
        
        if progress_callback:
            await progress_callback(60, f"Aligning timestamps for {result.get('language', 'unknown')} language...")
        print("📊 [3/4] Aligning timestamps...")
        # Align whisper output
        model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=DEVICE)
        result = whisperx.align(result["segments"], model_a, metadata, audio, DEVICE, return_char_alignments=False)
        print("✅ Timestamp alignment complete")
        
        if progress_callback:
            await progress_callback(80, "Converting to transcript blocks...")
        print("📊 [4/4] Converting to transcript blocks...")
        # Convert segments to TranscriptBlock format
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
            
            # Update progress during conversion
            if progress_callback and (idx + 1) % 5 == 0:
                progress = 80 + int((idx + 1) / total_segments * 15)  # 80-95%
                await progress_callback(progress, f"Processing segments... {idx + 1}/{total_segments}")
            
            if (idx + 1) % 5 == 0:  # Print every 5 segments
                print(f"   Processed {idx + 1}/{total_segments} segments")
        
        if progress_callback:
            await progress_callback(95, "Finalizing...")
        print(f"✅ All segments processed! Total: {len(transcript_blocks)} blocks")
        return transcript_blocks
        
    except Exception as e:
        print(f"❌ Error during transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

def transcribe_with_whisperx(audio_file_path: str) -> List[TranscriptBlock]:
    """Synchronous wrapper for backward compatibility."""
    return asyncio.run(transcribe_with_whisperx_progress(audio_file_path, None))

async def transcribe_with_whisper_cpp(audio_file_path: str, progress_queue=None) -> List[TranscriptBlock]:
    """
    Transcribe audio using whisper.cpp (local, FREE, Metal-accelerated on Apple Silicon)
    Cost: $0 (runs locally)
    
    Args:
        audio_file_path: Path to the audio file
        progress_queue: Optional asyncio.Queue for progress updates
        
    Returns:
        List of TranscriptBlock objects with timestamps
    """
    # Path to whisper.cpp binary and model
    whisper_binary = "/opt/homebrew/bin/whisper-cli"
    model_path = os.path.join(os.path.dirname(__file__), "models", "ggml-base.bin")
    
    if not os.path.exists(whisper_binary):
        raise HTTPException(status_code=500, detail="whisper.cpp not installed. Run: brew install whisper-cpp")
    
    if not os.path.exists(model_path):
        raise HTTPException(status_code=500, detail=f"Model not found at {model_path}. Download from huggingface.")
    
    try:
        print("📊 Using whisper.cpp for transcription (FREE, Metal-accelerated)...")
        
        # Run whisper.cpp with progress tracking
        cmd = [
            whisper_binary,
            "-m", model_path,
            "-t", "4",  # Use 4 threads
            "-ml", "80",  # Max segment length in characters
            "-l", "auto",  # Auto-detect language
            "-pp",  # Print progress
            "-f", audio_file_path,
        ]
        
        print(f"Running: {' '.join(cmd)}")
        
        # Run process and capture progress from stderr
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
            
            # Read stderr for progress in real-time
            while True:
                # Check if process is still running
                if process.poll() is not None:
                    break
                
                # Read available stderr (progress info)
                if process.stderr:
                    line = process.stderr.readline()
                    if line:
                        stderr_output.append(line)
                        # Parse progress from whisper.cpp output
                        # Format: "whisper_print_progress_callback: progress = XX%"
                        if "progress" in line.lower() and "%" in line:
                            try:
                                # Extract percentage
                                match = re.search(r'(\d+)%', line)
                                if match:
                                    progress = int(match.group(1))
                                    # Scale to 10-80% range (save 80-100 for post-processing)
                                    scaled_progress = 10 + int(progress * 0.7)
                                    print(f"📊 Progress: {progress}% (scaled: {scaled_progress}%)")
                                    # Put progress in queue if available
                                    if progress_queue:
                                        try:
                                            asyncio.run_coroutine_threadsafe(
                                                progress_queue.put((scaled_progress, f'Transcribing... {progress}%')),
                                                loop
                                            )
                                        except:
                                            pass
                            except Exception as e:
                                print(f"Could not parse progress: {e}")
            
            # Get remaining output
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
        
        print(f"✅ whisper.cpp transcription complete!")
        
        # Parse the output - whisper-cli outputs timestamps in format:
        # [00:00:00.000 --> 00:00:05.000]  Text here
        transcript_blocks = []
        lines = result_dict['stdout'].strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('whisper_'):
                continue
            
            # Try to parse timestamp format: [HH:MM:SS.mmm --> HH:MM:SS.mmm]  Text
            if line.startswith('[') and ']' in line:
                try:
                    # Extract timestamp and text
                    timestamp_part, text = line.split(']', 1)
                    timestamp_part = timestamp_part.strip('[]')
                    
                    if '-->' in timestamp_part:
                        start_time_str, end_time_str = timestamp_part.split('-->')
                        start_time_str = start_time_str.strip()
                        end_time_str = end_time_str.strip()
                        
                        # Convert HH:MM:SS.mmm to seconds
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
                except Exception as parse_error:
                    print(f"Warning: Could not parse line: {line[:100]}")
                    continue
        
        # Fallback: if no timestamps found, create single block with full text
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
        
        print(f"✅ Created {len(transcript_blocks)} transcript blocks (FREE!)")
        return transcript_blocks
        
    except subprocess.CalledProcessError as e:
        print(f"❌ whisper.cpp error: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"whisper.cpp failed: {e.stderr}")
    except Exception as e:
        print(f"❌ Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

async def transcribe_with_openai(audio_file_path: str) -> List[TranscriptBlock]:
    """
    Transcribe audio using OpenAI Whisper API.
    Cost: $0.006 per minute (~$0.36/hour)
    
    Args:
        audio_file_path: Path to the audio file
        
    Returns:
        List of TranscriptBlock objects with timestamps
    """
    if not OPENAI_AVAILABLE:
        raise HTTPException(status_code=500, detail="OpenAI client not installed")
    
    # Get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail="OPENAI_API_KEY not found. Set it in environment or .env file"
        )
    
    try:
        print("📊 Using OpenAI Whisper API for transcription...")
        client = OpenAI(api_key=api_key)
        
        # Open audio file
        with open(audio_file_path, "rb") as audio_file:
            # Transcribe with word-level timestamps
            transcript = await asyncio.to_thread(
                client.audio.transcriptions.create,
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        
        print(f"✅ OpenAI transcription complete!")
        print(f"   Language: {transcript.language}")
        print(f"   Duration: {transcript.duration:.2f} seconds")
        print(f"   Cost: ~${(transcript.duration / 60) * 0.006:.4f}")
        
        # Convert to TranscriptBlock format
        transcript_blocks = []
        
        # Group words into sentences (approximate)
        if hasattr(transcript, 'words') and transcript.words:
            current_block_words = []
            current_start = None
            
            for word_data in transcript.words:
                if current_start is None:
                    current_start = word_data.start
                
                current_block_words.append(word_data.word)
                
                # Create a new block every ~10 words or at sentence boundaries
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
            
            # Add remaining words
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
            # Fallback: single block with full text
            block = TranscriptBlock(
                id=str(uuid.uuid4()),
                timestamp=0.0,
                duration=float(getattr(transcript, 'duration', 0)),
                text=transcript.text
            )
            transcript_blocks.append(block)
        
        print(f"✅ Created {len(transcript_blocks)} transcript blocks")
        return transcript_blocks
        
    except Exception as e:
        print(f"❌ OpenAI transcription error: {str(e)}")
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

@app.post("/api/transcribe-stream")
async def transcribe_stream_endpoint(audio_file: UploadFile = File(...)):
    """
    ENDPOINT: Handles audio file upload and streams progress updates via Server-Sent Events.
    
    Returns real-time progress updates and final transcript.
    """
    print("=" * 80)
    print("🎤 TRANSCRIBE STREAM ENDPOINT HIT!")
    print(f"📁 File name: {audio_file.filename}")
    print(f"📋 Content type: {audio_file.content_type}")
    print("=" * 80)
    
    if audio_file.content_type not in ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"]:
        print(f"❌ Invalid content type: {audio_file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid file type. Only MP3 and WAV supported.")
    
    # Read file content BEFORE starting the stream (file handle will close otherwise)
    print("📥 Reading uploaded file...")
    file_content = await audio_file.read()
    print(f"✅ File read successfully: {len(file_content)} bytes")
    file_extension = ".mp3" if "mp3" in audio_file.content_type else ".wav"
    
    async def event_generator():
        temp_file = None
        try:
            # Send initial progress
            yield f"data: {json.dumps({'progress': 5, 'message': 'Uploading file...'})}\n\n"
            await asyncio.sleep(0.1)  # Give frontend time to process
            
            # Save file content to temp file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
            temp_file.write(file_content)
            temp_file.close()
            print(f"💾 Saved to temp file: {temp_file.name}")
            
            # Transcribe with progress updates
            # Priority: whisper.cpp (FREE!) > WhisperX Local > OpenAI API > Mock Data
            if os.path.exists("/opt/homebrew/bin/whisper-cli"):
                print("🚀 Using whisper.cpp (FREE, Metal-accelerated)...")
                yield f"data: {json.dumps({'progress': 10, 'message': 'Transcribing with whisper.cpp (FREE!)...'})}\n\n"
                await asyncio.sleep(0.1)
                
                # Create progress queue for real-time updates
                progress_queue = asyncio.Queue()
                
                # Start transcription in background
                transcription_task = asyncio.create_task(
                    transcribe_with_whisper_cpp(temp_file.name, progress_queue)
                )
                
                # Poll for progress updates
                last_progress = 10
                while not transcription_task.done():
                    try:
                        # Wait for progress update with timeout
                        progress_pct, message = await asyncio.wait_for(
                            progress_queue.get(),
                            timeout=0.5
                        )
                        if progress_pct > last_progress:
                            last_progress = progress_pct
                            yield f"data: {json.dumps({'progress': progress_pct, 'message': message})}\n\n"
                    except asyncio.TimeoutError:
                        # No progress update, continue waiting
                        pass
                
                # Get the result
                transcript_blocks = await transcription_task
                
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"
                await asyncio.sleep(0.1)
                
            elif OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
                print("🚀 Using OpenAI Whisper API...")
                yield f"data: {json.dumps({'progress': 10, 'message': 'Transcribing with OpenAI Whisper API...'})}\n\n"
                await asyncio.sleep(0.1)
                
                transcript_blocks = await transcribe_with_openai(temp_file.name)
                
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"
                await asyncio.sleep(0.1)
                
            elif WHISPERX_AVAILABLE:
                print("🚀 Starting WhisperX transcription...")
                
                # Send progress updates
                yield f"data: {json.dumps({'progress': 10, 'message': 'Loading audio file...'})}\n\n"
                await asyncio.sleep(0.1)
                
                # Run blocking transcription in thread pool
                loop = asyncio.get_event_loop()
                with ThreadPoolExecutor() as executor:
                    # Load audio
                    audio = await loop.run_in_executor(executor, whisperx.load_audio, temp_file.name)
                    print(f"✅ Audio loaded: {len(audio)/16000:.2f} seconds")
                    
                    yield f"data: {json.dumps({'progress': 25, 'message': 'Transcribing with WhisperX...'})}\n\n"
                    await asyncio.sleep(0.1)
                    
                    # Transcribe
                    result = await loop.run_in_executor(
                        executor,
                        lambda: WHISPER_MODEL.transcribe(audio, batch_size=16)
                    )
                    print(f"✅ Detected language: {result.get('language', 'unknown')}, {len(result.get('segments', []))} segments")
                    
                    yield f"data: {json.dumps({'progress': 60, 'message': f'Aligning timestamps ({result.get('language', 'unknown')})...'})}\n\n"
                    await asyncio.sleep(0.1)
                    
                    # Align
                    model_a, metadata = await loop.run_in_executor(
                        executor,
                        lambda: whisperx.load_align_model(language_code=result["language"], device=DEVICE)
                    )
                    result = await loop.run_in_executor(
                        executor,
                        lambda: whisperx.align(result["segments"], model_a, metadata, audio, DEVICE, return_char_alignments=False)
                    )
                    print("✅ Timestamp alignment complete")
                    
                    yield f"data: {json.dumps({'progress': 80, 'message': 'Converting segments...'})}\n\n"
                    await asyncio.sleep(0.1)
                
                # Convert segments
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
                
                print(f"✅ Transcription complete! Generated {len(transcript_blocks)} blocks")
            else:
                print("⚠️  WhisperX not available, using mock data")
                yield f"data: {json.dumps({'progress': 50, 'message': 'Using mock data...'})}\n\n"
                await asyncio.sleep(1)
                transcript_blocks = generate_mock_transcript()
            
            # Send completion with transcript
            yield f"data: {json.dumps({'progress': 100, 'message': 'Complete!', 'transcript': [block.model_dump() for block in transcript_blocks]})}\n\n"
            print("📤 Transcript sent to frontend")
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except Exception as e:
                    print(f"Error deleting temp file: {str(e)}")
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/transcribe", response_model=List[TranscriptBlock])
async def transcribe_endpoint(audio_file: UploadFile = File(...)):
    """
    ENDPOINT: Handles audio file upload and triggers real WhisperX transcription.
    (Original endpoint - kept for backward compatibility)
    """
    print("=" * 80)
    print("🎤 TRANSCRIBE ENDPOINT HIT!")
    print(f"📁 File name: {audio_file.filename}")
    print(f"📋 Content type: {audio_file.content_type}")
    print("=" * 80)
    
    if audio_file.content_type not in ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"]:
        print(f"❌ Invalid content type: {audio_file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid file type. Only MP3 and WAV supported.")
    
    # Create a temporary file to store the uploaded audio
    temp_file = None
    try:
        print("📥 Reading uploaded file...")
        # Read the uploaded file content
        content = await audio_file.read()
        print(f"✅ File read successfully: {len(content)} bytes")
        
        # Create a temporary file with the appropriate extension
        file_extension = ".mp3" if "mp3" in audio_file.content_type else ".wav"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        temp_file.write(content)
        temp_file.close()
        print(f"💾 Saved to temp file: {temp_file.name}")
        
        # If WhisperX is available, use it for transcription
        if WHISPERX_AVAILABLE:
            print("🚀 Starting WhisperX transcription...")
            transcript_blocks = transcribe_with_whisperx(temp_file.name)
            print(f"✅ Transcription complete! Generated {len(transcript_blocks)} blocks")
        else:
            # Fall back to mock data if WhisperX is not available
            print("⚠️  WhisperX not available, using mock data")
            time.sleep(2)  # Simulate transcription time
            transcript_blocks = generate_mock_transcript()
        
        print("📤 Returning transcript blocks to frontend")
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