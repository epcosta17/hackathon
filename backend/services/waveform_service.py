"""Waveform generation service for audio visualization."""
import wave
import numpy as np
from typing import List, Optional


def generate_waveform(audio_path: str, samples: int = 250) -> Optional[List[float]]:
    """
    Generate waveform visualization data from audio file.
    
    Args:
        audio_path: Path to the audio file
        samples: Number of waveform bars to generate
        
    Returns:
        List of normalized amplitude values (0-1) or None if generation fails
    """
    try:
        # Try to open as WAV file
        with wave.open(audio_path, 'rb') as wav_file:
            # Get audio parameters
            n_channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            framerate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            
            # Read all frames
            frames = wav_file.readframes(n_frames)
            
            # Convert to numpy array
            if sample_width == 1:
                dtype = np.uint8
            elif sample_width == 2:
                dtype = np.int16
            elif sample_width == 4:
                dtype = np.int32
            else:
                return None
            
            audio_data = np.frombuffer(frames, dtype=dtype)
            
            # If stereo, convert to mono by averaging channels
            if n_channels == 2:
                audio_data = audio_data.reshape(-1, 2).mean(axis=1)
            
            # Convert to float and normalize to -1 to 1
            if dtype == np.uint8:
                audio_data = (audio_data.astype(np.float32) - 128) / 128
            else:
                audio_data = audio_data.astype(np.float32) / np.iinfo(dtype).max
            
            # Calculate RMS for each segment
            segment_length = len(audio_data) // samples
            waveform = []
            
            for i in range(samples):
                start = i * segment_length
                end = start + segment_length
                segment = audio_data[start:end]
                
                # Calculate RMS (Root Mean Square)
                rms = np.sqrt(np.mean(segment ** 2))
                waveform.append(float(rms))
            
            # Normalize to 0-1 range
            max_val = max(waveform) if waveform else 1.0
            if max_val > 0:
                normalized = [val / max_val for val in waveform]
            else:
                normalized = waveform
            
            return normalized
            
    except Exception as e:
        print(f"⚠️  Failed to generate waveform: {str(e)}")
        return None


def generate_waveform_from_mp3(audio_path: str, samples: int = 250) -> Optional[List[float]]:
    """
    Generate waveform from MP3 file by converting to WAV first.
    
    Args:
        audio_path: Path to the MP3 audio file
        samples: Number of waveform bars to generate
        
    Returns:
        List of normalized amplitude values (0-1) or None if generation fails
    """
    try:
        import subprocess
        import tempfile
        import os
        
        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
            temp_wav_path = temp_wav.name
        
        try:
            # Convert MP3 to WAV using ffmpeg
            subprocess.run([
                'ffmpeg',
                '-i', audio_path,
                '-ar', '22050',  # Sample rate
                '-ac', '1',      # Mono
                '-y',            # Overwrite
                temp_wav_path
            ], check=True, capture_output=True)
            
            # Generate waveform from WAV
            waveform = generate_waveform(temp_wav_path, samples)
            
            return waveform
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)
                
    except Exception as e:
        print(f"⚠️  Failed to generate waveform from MP3: {str(e)}")
        return None


def generate_waveform_universal(audio_path: str, samples: int = 250) -> List[float]:
    """
    Universal waveform generator that handles both WAV and MP3 files.
    Falls back to placeholder data if generation fails.
    
    Args:
        audio_path: Path to the audio file
        samples: Number of waveform bars to generate
        
    Returns:
        List of normalized amplitude values (0-1)
    """
    # Try WAV first (fastest)
    if audio_path.lower().endswith('.wav'):
        waveform = generate_waveform(audio_path, samples)
        if waveform:
            return waveform
    
    # Try MP3 conversion
    if audio_path.lower().endswith('.mp3'):
        waveform = generate_waveform_from_mp3(audio_path, samples)
        if waveform:
            return waveform
    
    # Fallback: generate placeholder waveform
    print(f"⚠️  Using placeholder waveform for {audio_path}")
    import random
    random.seed(hash(audio_path))  # Consistent per file
    return [random.uniform(0.3, 1.0) for _ in range(samples)]

