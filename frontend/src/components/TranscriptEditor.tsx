import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Edit2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { TranscriptBlock, AnalysisData } from '../App';
import { motion } from 'motion/react';

interface TranscriptEditorProps {
  transcriptBlocks: TranscriptBlock[];
  setTranscriptBlocks: (blocks: TranscriptBlock[]) => void;
  onAnalysisComplete: (data: AnalysisData) => void;
  audioFile: File | null;
}

export function TranscriptEditor({
  transcriptBlocks,
  setTranscriptBlocks,
  onAnalysisComplete,
  audioFile,
}: TranscriptEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBlockRef = useRef<HTMLDivElement | null>(null);

  // Create audio URL from file
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  // Update current time from audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const getCurrentBlock = () => {
    // First try exact match
    let block = transcriptBlocks.find(
      (block) => currentTime >= block.timestamp && currentTime < block.timestamp + block.duration
    );
    
    // If no exact match, find the closest block (last one before or at current time)
    if (!block && transcriptBlocks.length > 0) {
      block = transcriptBlocks
        .filter(b => b.timestamp <= currentTime)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      // If still nothing, just use the first block
      if (!block) {
        block = transcriptBlocks[0];
      }
    }
    
    return block;
  };

  const currentBlock = getCurrentBlock();

  // Auto-scroll to active block during playback
  useEffect(() => {
    if (autoScrollEnabled && currentBlock?.id) {
      // Use requestAnimationFrame to ensure ref is attached after React updates DOM
      requestAnimationFrame(() => {
        if (activeBlockRef.current) {
          activeBlockRef.current.scrollIntoView({
            behavior: 'auto', // Instant jump, no animation
            block: 'start',
          });
        }
      });
    }
  }, [currentBlock?.id, autoScrollEnabled]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
      // Re-enable auto-scroll when playing
      setAutoScrollEnabled(true);
    }
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
    
    // Disable auto-scroll when scrubbing - it will be re-enabled when play is pressed
    setAutoScrollEnabled(false);
    
    // Find the block for this time IMMEDIATELY (don't wait for state update)
    let targetBlock = transcriptBlocks.find(
      (block) => newTime >= block.timestamp && newTime < block.timestamp + block.duration
    );
    
    if (!targetBlock && transcriptBlocks.length > 0) {
      targetBlock = transcriptBlocks
        .filter(b => b.timestamp <= newTime)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      if (!targetBlock) {
        targetBlock = transcriptBlocks[0];
      }
    }
    
    // Scroll to the target block by finding it in the DOM
    if (targetBlock) {
      setTimeout(() => {
        // Find the element with this block's key
        const element = document.querySelector(`[data-block-id="${targetBlock.id}"]`);
        if (element) {
          element.scrollIntoView({
            behavior: 'auto', // Instant jump, no animation
            block: 'start',
          });
        }
      }, 50);
    }
  };

  const jumpToTimestamp = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
    }
    setCurrentTime(timestamp);
    setIsPlaying(true);
    // Disable auto-scroll when clicking a segment
    setAutoScrollEnabled(false);
  };

  const handleBlockEdit = (id: string, newText: string) => {
    setTranscriptBlocks(
      transcriptBlocks.map((block) =>
        block.id === id ? { ...block, text: newText } : block
      )
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number): string => {
    // Color words based on confidence: high confidence = white, low = yellow/red
    if (confidence >= 0.95) return 'text-zinc-100';  // High confidence - white
    if (confidence >= 0.85) return 'text-zinc-300';  // Good confidence - light gray
    if (confidence >= 0.75) return 'text-yellow-400'; // Medium confidence - yellow
    return 'text-red-400'; // Low confidence - red
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Send full transcript with timestamps and speakers
      const response = await fetch('http://127.0.0.1:8000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript_blocks: transcriptBlocks
        }),
      });

      if (response.ok) {
        const data: AnalysisData = await response.json();
        onAnalysisComplete(data);
      } else {
        console.error('Analysis failed:', response.statusText);
        alert('Analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during analysis:', error);
      alert('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen max-h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
      
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white">Transcript Editor</h1>
              <p className="text-zinc-400 text-sm">Review and refine the interview transcript</p>
            </div>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
            </Button>
          </div>
        </div>
      </header>

      {/* Audio Player */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 flex-shrink-0">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center gap-6">
            <Button
              onClick={togglePlayPause}
              variant="outline"
              className="w-12 h-12 rounded-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700 p-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </Button>
            
            <div className="flex-1 flex items-center gap-4">
              <span className="text-zinc-400 text-sm min-w-[3rem]">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={currentTime}
                onChange={handleScrub}
                className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-zinc-400 text-sm min-w-[3rem]">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="max-w-[1800px] mx-auto h-full">
          <div className="grid grid-cols-5 h-full">
            {/* Left Side - Transcript (60%) */}
            <div className="col-span-3 border-r border-zinc-800 flex flex-col h-full">
              <div className="p-8 pb-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-zinc-400 text-sm font-medium">
                  Transcript Segments ({transcriptBlocks.length})
                </h2>
                <span className="text-xs text-zinc-500">
                  Scroll to view all segments
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-hidden" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                <div className="max-w-3xl space-y-4">
                {transcriptBlocks.map((block) => {
                  const isActive = currentBlock?.id === block.id;
                  const isEditing = editingBlockId === block.id;

                  return (
                    <motion.div
                      key={block.id}
                      data-block-id={block.id}
                      ref={isActive ? activeBlockRef : null}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`
                        group relative p-4 rounded-lg border transition-all duration-200
                        ${isActive ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 bg-zinc-900/30'}
                      `}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => jumpToTimestamp(block.timestamp)}
                            className="text-xs text-zinc-500 hover:text-blue-400 transition-colors"
                          >
                            {formatTime(block.timestamp)}
                          </button>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            {isEditing ? (
                              <Textarea
                                value={block.text}
                                onChange={(e) => handleBlockEdit(block.id, e.target.value)}
                                onBlur={() => setEditingBlockId(null)}
                                autoFocus
                                className="min-h-[80px] bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                              />
                            ) : (
                              <p
                                onClick={() => jumpToTimestamp(block.timestamp)}
                                className="cursor-pointer leading-relaxed"
                              >
                                {block.words && block.words.length > 0 ? (
                                  // Render words with confidence-based coloring
                                  block.words.map((word, idx) => (
                                    <span
                                      key={idx}
                                      className={`${getConfidenceColor(word.confidence)} transition-colors`}
                                      title={`Confidence: ${(word.confidence * 100).toFixed(1)}%`}
                                    >
                                      {word.text}{idx < block.words!.length - 1 ? ' ' : ''}
                                    </span>
                                  ))
                                ) : (
                                  // Fallback to plain text if no word data
                                  <span className="text-zinc-100">{block.text}</span>
                                )}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => setEditingBlockId(block.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-zinc-800 rounded"
                          >
                            <Edit2 className="w-4 h-4 text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Right Side - Info Panel (40%) */}
            <div className="col-span-2 bg-zinc-900/20 p-8 overflow-hidden h-full">
              <div className="space-y-6">
                <div>
                  <h3 className="text-white mb-2">Transcript Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 text-sm">Total Blocks</span>
                      <span className="text-white">{transcriptBlocks.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 text-sm">Duration</span>
                      <span className="text-white">{formatTime(duration)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 text-sm">Word Count</span>
                      <span className="text-white">
                        {transcriptBlocks.reduce((acc, block) => acc + block.text.split(' ').length, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-blue-400 mb-2">How to Use</h4>
                  <ul className="text-zinc-300 text-sm space-y-2">
                    <li>• Click any timestamp to jump to that point</li>
                    <li>• Click the edit icon to modify text</li>
                    <li>• Active block highlights as audio plays</li>
                    <li>• Click "Run AI Analysis" when ready</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
