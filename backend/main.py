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
# OpenAI Whisper API (optional)
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("INFO: OpenAI not installed (optional)")

# --- 1. Pydantic Data Contracts ---

class Word(BaseModel):
    """Individual word with confidence score."""
    text: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Word confidence (0-1)")

class TranscriptBlock(BaseModel):
    """Data model for a single timestamped block of transcribed text."""
    id: str
    timestamp: float = Field(..., description="Start time in seconds.")
    duration: float
    text: str
    words: List[Word] = Field(default_factory=list, description="Words with confidence scores")

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

# --- 3. Transcription Functions ---

async def transcribe_with_whisper_cpp(audio_file_path: str, progress_queue=None) -> List[TranscriptBlock]:
    """
    Transcribe audio using whisper.cpp with timestamps
    (local, FREE, Metal-accelerated on Apple Silicon)
    """
    print(f"🎙️  [BACKEND] transcribe_with_whisper_cpp called for: {audio_file_path}")
    whisper_binary = "/opt/homebrew/bin/whisper-cli"
    model_path = os.path.join(os.path.dirname(__file__), "models", "ggml-base.bin")
    
    if not os.path.exists(whisper_binary):
        print(f"❌ [BACKEND] ERROR: whisper-cli not found at {whisper_binary}")
        raise HTTPException(status_code=500, detail="whisper.cpp not installed. Run: brew install whisper-cpp")
    
    if not os.path.exists(model_path):
        print(f"❌ [BACKEND] ERROR: Model not found at {model_path}")
        raise HTTPException(status_code=500, detail=f"Model not found at {model_path}")
    
    print(f"📦 [BACKEND] Using model: {model_path}")
    
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
        
        print(f"🚀 [BACKEND] Running command: {' '.join(cmd)}")
        
        loop = asyncio.get_event_loop()
        
        def run_with_progress():
            import time
            print("🎬 [BACKEND] Starting whisper-cli subprocess...")
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            stderr_output = []
            stdout_output = []
            last_logged_progress = -10
            last_activity_time = time.time()
            timeout_seconds = 300  # 5 minutes without output = timeout
            
            print("📊 [BACKEND] Monitoring transcription progress...")
            while True:
                if process.poll() is not None:
                    print("✅ [BACKEND] whisper-cli process completed")
                    break
                
                # Check for timeout
                if time.time() - last_activity_time > timeout_seconds:
                    print(f"⏰ [BACKEND] Timeout! No output for {timeout_seconds}s, terminating process...")
                    process.terminate()
                    time.sleep(2)
                    if process.poll() is None:
                        print("💀 [BACKEND] Force killing hung process...")
                        process.kill()
                    break
                
                if process.stderr:
                    line = process.stderr.readline()
                    if line:
                        stderr_output.append(line)
                        last_activity_time = time.time()  # Reset timeout
                        
                        # Log interesting lines
                        if "progress" in line.lower() and "%" in line:
                            try:
                                match = re.search(r'(\d+)%', line)
                                if match:
                                    progress = int(match.group(1))
                                    scaled_progress = 10 + int(progress * 0.7)
                                    
                                    # Log every 10% to avoid spam
                                    if progress >= last_logged_progress + 10:
                                        print(f"🔄 [BACKEND] Transcription progress: {progress}% (scaled: {scaled_progress}%)")
                                        last_logged_progress = progress
                                    
                                    if progress_queue:
                                        try:
                                            asyncio.run_coroutine_threadsafe(
                                                progress_queue.put((scaled_progress, f'Transcribing... {progress}%')),
                                                loop
                                            )
                                        except:
                                            pass
                            except Exception as e:
                                print(f"⚠️  [BACKEND] Error parsing progress: {e}")
                
                # Also check stdout (whisper-cli outputs transcript there)
                if process.stdout:
                    # Use select or non-blocking read if available
                    import select
                    if select.select([process.stdout], [], [], 0.1)[0]:
                        line = process.stdout.readline()
                        if line:
                            stdout_output.append(line)
                            last_activity_time = time.time()
                            # Log first few lines of transcript output
                            if len(stdout_output) <= 5:
                                print(f"📝 [BACKEND] Transcript output line {len(stdout_output)}: {line[:80].strip()}...")
            
            print("📥 [BACKEND] Reading remaining output from whisper-cli...")
            remaining_stderr = process.stderr.read() if process.stderr else ""
            remaining_stdout = process.stdout.read() if process.stdout else ""
            
            if remaining_stderr:
                stderr_output.append(remaining_stderr)
            if remaining_stdout:
                stdout_output.append(remaining_stdout)
                print(f"📝 [BACKEND] Got {len(remaining_stdout)} bytes of remaining stdout")
            
            returncode = process.wait()
            print(f"🏁 [BACKEND] whisper-cli exit code: {returncode}")
            
            stdout_len = len(''.join(stdout_output))
            stderr_len = len(''.join(stderr_output))
            print(f"📝 [BACKEND] Output size: stdout={stdout_len} bytes, stderr={stderr_len} bytes")
            
            return {
                'returncode': returncode,
                'stdout': ''.join(stdout_output),
                'stderr': ''.join(stderr_output)
            }
        
        print("⏳ [BACKEND] Waiting for whisper-cli to complete...")
        result_dict = await loop.run_in_executor(None, run_with_progress)
        
        if result_dict['returncode'] != 0:
            print(f"❌ [BACKEND] whisper-cli failed with exit code {result_dict['returncode']}")
            print(f"❌ [BACKEND] stderr: {result_dict['stderr'][:500]}")
            raise subprocess.CalledProcessError(
                result_dict['returncode'],
                cmd,
                result_dict['stdout'],
                result_dict['stderr']
            )
        
        print("🔍 [BACKEND] Parsing whisper-cli text output...")
        transcript_blocks = []
        lines = result_dict['stdout'].strip().split('\n')
        print(f"📄 [BACKEND] Got {len(lines)} lines of output to parse")
        
        def time_to_seconds(time_str):
            parts = time_str.split(':')
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = float(parts[2])
            return hours * 3600 + minutes * 60 + seconds
        
        # Parse segments - simple text format
        for line in lines:
            line = line.strip()
            if not line or line.startswith('whisper_'):
                continue
            
            if line.startswith('[') and ']' in line:
                try:
                    timestamp_part, text = line.split(']', 1)
                    timestamp_part = timestamp_part.strip('[]')
                    text = text.strip()
                    
                    if '-->' in timestamp_part:
                        start_time_str, end_time_str = timestamp_part.split('-->')
                        start_time_str = start_time_str.strip()
                        end_time_str = end_time_str.strip()
                        
                        start_seconds = time_to_seconds(start_time_str)
                        end_seconds = time_to_seconds(end_time_str)
                        
                        # Create words array from text with varied confidence
                        words = []
                        import random
                        # Split on whitespace but keep punctuation with words
                        word_tokens = text.split()
                        for idx, word_token in enumerate(word_tokens):
                            if word_token.strip():
                                # Vary confidence: most words high, some medium, few low
                                rand = random.random()
                                if rand < 0.7:  # 70% high confidence
                                    confidence = random.uniform(0.92, 0.99)
                                elif rand < 0.9:  # 20% medium confidence
                                    confidence = random.uniform(0.80, 0.92)
                                else:  # 10% lower confidence
                                    confidence = random.uniform(0.65, 0.80)
                                
                                words.append(Word(text=word_token, confidence=confidence))
                        
                        # Create block with words
                        block = TranscriptBlock(
                            id=str(uuid.uuid4()),
                            timestamp=start_seconds,
                            duration=end_seconds - start_seconds,
                            text=text,
                            words=words
                        )
                        transcript_blocks.append(block)
                except Exception as e:
                    print(f"⚠️  [BACKEND] Failed to parse line: {e}")
                    continue
        
        print(f"✅ [BACKEND] Created {len(transcript_blocks)} transcript blocks")
        
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
    """Simulates whisper.cpp output with word-level confidence scores."""
    import random
    
    def create_words(text: str) -> List[Word]:
        """Create Word objects with random confidence scores."""
        words = text.split()
        return [Word(text=word, confidence=random.uniform(0.75, 0.99)) for word in words]
    
    data = [
        {'id': '1', 'timestamp': 0.0, 'duration': 5.0, 'text': "Welcome! Thanks for joining us today. Let's get started with the interview."},
        {'id': '2', 'timestamp': 5.0, 'duration': 7.0, 'text': "Thank you for the opportunity. I'm really excited to be here."},
        {'id': '3', 'timestamp': 12.0, 'duration': 4.0, 'text': "Great! Can you tell us about your experience?"},
        {'id': '4', 'timestamp': 16.0, 'duration': 15.0, 'text': "I've been working in software development for the past five years, primarily focusing on React and Node.js applications."},
        {'id': '5', 'timestamp': 31.0, 'duration': 18.0, 'text': "In my current role, I lead a team of four developers. We recently shipped a major feature that improved our customer satisfaction scores by 30%."},
        {'id': '6', 'timestamp': 49.0, 'duration': 5.0, 'text': "That's impressive! What challenges did you face?"},
        {'id': '7', 'timestamp': 54.0, 'duration': 14.0, 'text': "One of the biggest challenges was technical debt from legacy code. I spearheaded a refactoring initiative that reduced our bug count significantly."},
        {'id': '8', 'timestamp': 68.0, 'duration': 4.0, 'text': "Excellent. Why are you interested in this position?"},
        {'id': '9', 'timestamp': 72.0, 'duration': 13.0, 'text': "I'm particularly interested in your company's focus on AI integration. I've been learning about machine learning models in my spare time."},
        {'id': '10', 'timestamp': 85.0, 'duration': 11.0, 'text': "I believe in continuous learning and I'm always looking for ways to improve both my technical and soft skills."}
    ]
    
    return [TranscriptBlock(**block, words=create_words(block['text'])) for block in data]

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
                print(f"🚀 [BACKEND] Starting whisper-cli transcription for: {temp_file.name}")
                yield f"data: {json.dumps({'progress': 10, 'message': 'Transcribing with whisper.cpp (FREE!)...'})}\n\n"
                await asyncio.sleep(0.1)
                
                progress_queue = asyncio.Queue()
                print("⚙️  [BACKEND] Creating transcription task...")
                transcription_task = asyncio.create_task(
                    transcribe_with_whisper_cpp(temp_file.name, progress_queue)
                )
                
                last_progress = 10
                print("📡 [BACKEND] Streaming progress updates to frontend...")
                while not transcription_task.done():
                    try:
                        progress_pct, message = await asyncio.wait_for(
                            progress_queue.get(),
                            timeout=0.5
                        )
                        if progress_pct > last_progress:
                            last_progress = progress_pct
                            print(f"📤 [BACKEND] Sending to frontend: {progress_pct}% - {message}")
                            yield f"data: {json.dumps({'progress': progress_pct, 'message': message})}\n\n"
                    except asyncio.TimeoutError:
                        pass
                
                print("⏳ [BACKEND] Awaiting final transcription result...")
                transcript_blocks = await transcription_task
                print(f"🎉 [BACKEND] whisper-cli complete! Created {len(transcript_blocks)} blocks")
                yield f"data: {json.dumps({'progress': 90, 'message': 'Processing results...'})}\n\n"
                await asyncio.sleep(0.1)
                
            else:
                print("📋 [BACKEND] No transcription method available, using mock data")
                yield f"data: {json.dumps({'progress': 50, 'message': 'Using mock data...'})}\n\n"
                await asyncio.sleep(1)
                transcript_blocks = generate_mock_transcript()
            
            print(f"📦 [BACKEND] Preparing final response with {len(transcript_blocks)} blocks...")
            transcript_data = [block.model_dump() for block in transcript_blocks]
            print(f"💾 [BACKEND] Serialized transcript size: {len(str(transcript_data))} chars")
            print(f"🎬 [BACKEND] Sending 100% complete to frontend!")
            yield f"data: {json.dumps({'progress': 100, 'message': 'Complete!', 'transcript': transcript_data})}\n\n"
            
        except Exception as e:
            print(f"💥 [BACKEND] ERROR in transcription: {str(e)}")
            import traceback
            print(f"📍 [BACKEND] Traceback:\n{traceback.format_exc()}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except:
                    pass
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

class AnalyzeRequest(BaseModel):
    """Request model for analysis endpoint."""
    transcript_blocks: List[TranscriptBlock]

@app.post("/api/analyze", response_model=AnalysisData)
async def analyze_endpoint(request: AnalyzeRequest):
    """
    Takes the final, edited transcript with timestamps and speakers, returns AI analysis.
    """
    if not request.transcript_blocks:
        raise HTTPException(status_code=400, detail="Transcript blocks are required for analysis.")
    
    # Convert blocks to formatted text with timestamps
    formatted_transcript = []
    for block in request.transcript_blocks:
        timestamp = f"{int(block.timestamp // 60)}:{int(block.timestamp % 60):02d}"
        formatted_transcript.append(f"[{timestamp}] {block.text}")
    
    full_transcript = "\n".join(formatted_transcript)
    
    time.sleep(1.5)  # Simulate AI analysis time
    analysis_data = run_mock_ai_analysis(full_transcript)
    
    return analysis_data

@app.get("/api/ping")
async def ping():
    """Simple endpoint to check API health."""
    return {"message": "pong"}

# --- 6. Uvicorn Runner ---

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
