import React, { useState, useCallback } from 'react';
import { Upload, FileAudio } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { TranscriptBlock } from '../App';

interface UploadScreenProps {
  onTranscriptionComplete: (blocks: TranscriptBlock[], file: File) => void;
}

export function UploadScreen({ onTranscriptionComplete }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'audio/mpeg' || droppedFile.type === 'audio/wav')) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const startTranscription = async () => {
    if (!file) return;

    setIsTranscribing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("audio_file", file);

      // Use Server-Sent Events for real-time progress
      const response = await fetch('http://127.0.0.1:8000/api/transcribe-stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (data.progress !== undefined) {
              setProgress(data.progress);
              console.log(`Progress: ${data.progress}% - ${data.message}`);
            }
            
            if (data.transcript) {
              // Transcription complete!
              setTimeout(() => {
                onTranscriptionComplete(data.transcript, file);
              }, 500);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during transcription:', error);
      alert('An error occurred during transcription. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <FileAudio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white">Talent X-Ray</h1>
              <p className="text-zinc-400 text-sm">AI-Powered Talent Analysis</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex items-center justify-center p-8 bg-zinc-950 overflow-auto">
        <div className="max-w-2xl w-full space-y-8">
          {/* Title Section */}
          <div className="text-center space-y-2">
            <h2 className="text-white">Upload Interview Audio</h2>
            <p className="text-zinc-400">
              Transform raw interview recordings into structured talent profiles
            </p>
          </div>

          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-16 transition-all duration-200
              ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 bg-zinc-900/50'}
              ${file ? 'border-green-500 bg-green-500/5' : ''}
            `}
          >
            <input
              type="file"
              accept="audio/mpeg,audio/wav"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isTranscribing}
            />
            
            <div className="flex flex-col items-center gap-4">
              {!file ? (
                <>
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white">Drop your audio file here</p>
                    <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
                    <p className="text-zinc-600 text-sm mt-2">Supports MP3 and WAV files</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <FileAudio className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-white">{file.name}</p>
                    <p className="text-zinc-500 text-sm mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Progress Section */}
          {isTranscribing && (
            <div className="space-y-3 bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Transcribing audio...</span>
                <span className="text-zinc-400">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={startTranscription}
            disabled={!file || isTranscribing}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTranscribing ? 'Processing...' : 'Start Transcription & Analysis'}
          </Button>
        </div>
      </main>
    </div>
  );
}
