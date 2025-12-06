"""Transcription service - handles audio transcription logic."""
import os
import time
import uuid
import subprocess
import re
import asyncio
from typing import List
from fastapi import HTTPException
from httpx import request

from models.schemas import TranscriptBlock, Word


async def transcribe_with_deepgram(audio_file_path: str) -> List[TranscriptBlock]:
    """
    Transcribe audio using Deepgram API with diarization.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"transcribe_with_deepgram called for: {audio_file_path}")
    start_time = time.time()
    
    try:
        from deepgram import DeepgramClient
    except ImportError:
        logger.error("deepgram-sdk not installed")
        raise HTTPException(status_code=500, detail="deepgram-sdk not installed")

    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        logger.error("DEEPGRAM_API_KEY not found")
        raise HTTPException(
            status_code=500, 
            detail="DEEPGRAM_API_KEY not found. Set it in environment or .env file"
        )

    try:
        # Initialize the Deepgram SDK with increased timeout for large files
        # httpx default is 5s connect, wait longer for upload
        import httpx
        from deepgram import DeepgramClient
        
        # Initialize client with API Key
        deepgram = DeepgramClient(api_key=api_key)
        
        # Configure Deepgram options for audio analysis
        options = dict(
            model="nova-3-general",
            smart_format=True,
            diarize=True,
            punctuate=True,
            paragraphs=True,
            utterances=True,
        )

        logger.info("Sending audio to Deepgram...")
        
        if audio_file_path.startswith('http'):
             # URL-based transcription
             logger.info(f"Transcribing from URL: {audio_file_path}...")
             
             # Prepare options with URL
             url_options = options.copy()
             url_options['url'] = audio_file_path
             
             response = await asyncio.to_thread(
                deepgram.listen.v1.media.transcribe_url,
                **url_options
            )
        else:
            # File-based transcription
            with open(audio_file_path, "rb") as file:
                buffer_data = file.read()
            
            # Prepare options with request (buffer)
            file_options = options.copy()
            file_options['request'] = buffer_data
            
            response = await asyncio.to_thread(
                deepgram.listen.v1.media.transcribe_file,
                **file_options
            )
            
        api_duration = time.time() - start_time
        logger.info(f"⏱️ [DEEPGRAM SPEC] API Call took {api_duration:.2f}s")
        logger.info("Received response from Deepgram")

        parsing_start = time.time()
        # Parse the response
        transcript_blocks = []
        
        # We can use paragraphs or utterances. Paragraphs usually give better structure.
        # Check if we have results
        if not response.results or not response.results.channels:
            raise ValueError("No results from Deepgram")
            
        channel = response.results.channels[0]
        alternatives = channel.alternatives[0]
        
        # Use utterances for speaker-based segmentation (utterances are at results level)
        utterances = response.results.utterances if response.results.utterances else []
            
        logger.info(f"Parsing {len(utterances)} utterances from Deepgram")
        
        # Optimization: User pointed out that 'utterance' object already has 'words' list
        # We don't need to manually match words from the global list.
        # This drastically simplifies the logic.
        
        for utterance in utterances:
            start_time = utterance.start
            end_time = utterance.end
            
            # Use transcript field (has proper formatting) instead of text
            text = utterance.transcript
            
            # Capitalize first letter of the text
            if text:
                text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
            
            # Get speaker directly from utterance (utterances have speaker already assigned)
            utterance_speaker = getattr(utterance, 'speaker', None)
            speaker_label = f"Speaker {int(utterance_speaker)+1}" if utterance_speaker is not None else None
            
            # Direct access to words in the utterance
            utterance_words = utterance.words if utterance.words else []
            
            # Build a map of lowercased words to their confidence values
            word_confidence_map = {}
            for w in utterance_words:
                # Use punctuated_word if available, otherwise fall back to word
                word_text = getattr(w, 'punctuated_word', w.word)
                # Strip punctuation for matching and lowercase
                clean_word = ''.join(c for c in word_text if c.isalnum() or c == "'").lower()
                if clean_word:
                    word_confidence_map[clean_word] = w.confidence
            
            # Split transcript text into words and match with confidence values
            words = []
            # Split on whitespace while preserving punctuation attached to words
            transcript_words = text.split()
            
            for transcript_word in transcript_words:
                # Clean the word for matching (remove punctuation, lowercase)
                clean_word = ''.join(c for c in transcript_word if c.isalnum() or c == "'").lower()
                # Get confidence from map, default to 1.0 if not found
                confidence = word_confidence_map.get(clean_word, 1.0)
                
                words.append(Word(
                    text=transcript_word,
                    confidence=confidence
                ))

            block = TranscriptBlock(
                id=str(uuid.uuid4()),
                timestamp=start_time,
                duration=end_time - start_time,
                text=text,
                words=words,
                speaker=speaker_label
            )
            transcript_blocks.append(block)

        parsing_duration = time.time() - parsing_start
        logger.info(f"⏱️ [DEEPGRAM SPEC] Parsing/Logic took {parsing_duration:.2f}s")
        logger.info(f"Created {len(transcript_blocks)} transcript blocks from Deepgram")
        return transcript_blocks

    except Exception as e:
        logger.error(f"Deepgram transcription failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Deepgram transcription failed: {str(e)}")


async def transcribe_with_whisper_cpp(audio_file_path: str, progress_queue=None) -> List[TranscriptBlock]:
    """
    Transcribe audio using whisper.cpp with timestamps
    (local, FREE, Metal-accelerated on Apple Silicon)
    """
    print(f"🎙️  [BACKEND] transcribe_with_whisper_cpp called for: {audio_file_path}")
    whisper_binary = "/opt/homebrew/bin/whisper-cli"
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ai", "ggml-base.bin")
    
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
            "-t", "8",
            "-p", "4",
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
                        
                        # Capitalize first letter of the text
                        if text:
                            text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
                        
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
    try:
        from openai import OpenAI
        OPENAI_AVAILABLE = True
    except ImportError:
        OPENAI_AVAILABLE = False
    
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
                    text = ' '.join(current_block_words).strip()
                    # Capitalize first letter
                    if text:
                        text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
                    
                    block = TranscriptBlock(
                        id=str(uuid.uuid4()),
                        timestamp=float(current_start),
                        duration=float(word_data.end - current_start),
                        text=text
                    )
                    transcript_blocks.append(block)
                    current_block_words = []
                    current_start = None
            
            if current_block_words and current_start is not None:
                last_word = transcript.words[-1]
                text = ' '.join(current_block_words).strip()
                # Capitalize first letter
                if text:
                    text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
                
                block = TranscriptBlock(
                    id=str(uuid.uuid4()),
                    timestamp=float(current_start),
                    duration=float(last_word.end - current_start),
                    text=text
                )
                transcript_blocks.append(block)
        else:
            text = transcript.text
            # Capitalize first letter
            if text:
                text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
            
            block = TranscriptBlock(
                id=str(uuid.uuid4()),
                timestamp=0.0,
                duration=float(getattr(transcript, 'duration', 0)),
                text=text
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
