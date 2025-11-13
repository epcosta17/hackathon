import React, { useState, useCallback } from 'react';
import { Upload, FileAudio, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
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
  const [isComplete, setIsComplete] = useState(false);

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
            }
            
            if (data.transcript) {
              // Transcription complete!
              setIsComplete(true);
              setTimeout(() => {
                onTranscriptionComplete(data.transcript, file);
              }, 1500); // Give user time to see "Transcription Finished" message
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during transcription:', error);
      alert('An error occurred during transcription. Please try again.');
      setIsTranscribing(false);
      setIsComplete(false);
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
                <h1 className="text-white">Interview Lens</h1>
                <p className="text-zinc-400 text-sm">AI-Powered Interview Intelligence Platform</p>
              </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex items-center justify-center p-8 bg-zinc-950 overflow-auto">
        <motion.div 
          className="max-w-2xl w-full space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title Section */}
          <motion.div 
            className="text-center space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-white">Analyze Your Interview</h2>
            <p className="text-zinc-400">
              Transform interview recordings into actionable insights and comprehensive reports
            </p>
          </motion.div>

          {/* Upload Zone */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: isDragging || isTranscribing ? 1 : 1.02 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-16 transition-all duration-300
              ${isDragging ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-zinc-700 bg-zinc-900/50'}
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
            
            <motion.div 
              className="flex flex-col items-center gap-4"
              key={file ? 'with-file' : 'no-file'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {!file ? (
                <>
                  <motion.div 
                    className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Upload className="w-8 h-8 text-zinc-400" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-white">Drop your audio file here</p>
                    <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
                    <p className="text-zinc-600 text-sm mt-2">Supports MP3 and WAV files</p>
                  </div>
                </>
              ) : (
                <>
                  <motion.div 
                    className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <FileAudio className="w-8 h-8 text-green-500" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-white">{file.name}</p>
                    <p className="text-zinc-500 text-sm mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Progress Section */}
          {(isTranscribing || isComplete) && (
            <motion.div 
              className={`space-y-3 rounded-xl p-6 border transition-colors ${
                isComplete 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-zinc-900/50 border-zinc-800'
              }`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <span className={`${isComplete ? 'text-green-400' : 'text-zinc-300'}`}>
                  {isComplete ? 'Transcription complete!' : 'Transcribing audio...'}
                </span>
                <motion.span 
                  className={`${isComplete ? 'text-green-400' : 'text-zinc-400'}`}
                  key={progress}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {progress}%
                </motion.span>
              </div>
              <div className="relative">
                <Progress value={progress} className="h-2" />
                {isComplete && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-emerald-600 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: isComplete ? [1, 1.05, 1] : 1
            }}
            transition={{ 
              duration: 0.5, 
              delay: 0.3,
              scale: { duration: 0.4, ease: "easeInOut" }
            }}
          >
            <Button
              onClick={startTranscription}
              disabled={!file || isTranscribing}
              className={`w-full h-14 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                isComplete 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
              }`}
            >
              {isComplete ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Transcription Finished
                </>
              ) : (
                <>
                  <FileAudio className={`w-5 h-5 mr-2 ${isTranscribing ? 'animate-pulse' : ''}`} />
                  {isTranscribing ? 'Processing...' : 'Start Transcription & Analysis'}
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
