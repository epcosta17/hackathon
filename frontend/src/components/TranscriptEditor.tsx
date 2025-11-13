import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Edit2, Sparkles, Eye, FileText, Home, StickyNote, Bookmark, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { TranscriptBlock, AnalysisData } from '../App';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface Note {
  id: number;
  interview_id: number;
  timestamp: number;
  content: string;
  is_bookmark: boolean;
  created_at: string;
  updated_at: string;
}

interface TranscriptEditorProps {
  transcriptBlocks: TranscriptBlock[];
  setTranscriptBlocks: (blocks: TranscriptBlock[]) => void;
  onAnalysisComplete: (data: AnalysisData) => void;
  onViewAnalysis: () => void;
  onBackToUpload: () => void;
  audioFile: File | null;
  existingAnalysis: AnalysisData | null;
  currentInterviewId: number | null;
}

export function TranscriptEditor({
  transcriptBlocks,
  setTranscriptBlocks,
  onAnalysisComplete,
  onViewAnalysis,
  onBackToUpload,
  audioFile,
  existingAnalysis,
  currentInterviewId,
}: TranscriptEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBlockRef = useRef<HTMLDivElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const notesScrollRef = useRef<HTMLDivElement | null>(null);
  
  // Notes and Bookmarks state
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Create audio URL from file
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  // Fetch notes when interview is loaded
  useEffect(() => {
    if (currentInterviewId) {
      fetchNotes();
    }
  }, [currentInterviewId]);

  const fetchNotes = async () => {
    if (!currentInterviewId) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/interviews/${currentInterviewId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const addNote = async (isBookmark: boolean = false) => {
    if (!currentInterviewId || (!newNoteContent.trim() && !isBookmark)) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/interviews/${currentInterviewId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: currentTime,
          content: isBookmark ? `Bookmark at ${formatTime(currentTime)}` : newNoteContent,
          is_bookmark: isBookmark,
        }),
      });
      
      if (response.ok) {
        await fetchNotes();
        setNewNoteContent('');
        setIsAddingNote(false);
        toast.success(isBookmark ? 'Bookmark added!' : 'Note added!');
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    }
  };

  const deleteNote = async (noteId: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/notes/${noteId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchNotes();
        toast.success('Note deleted!');
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  const jumpToNote = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
    }
    setCurrentTime(timestamp);
    setIsPlaying(true);
    // Keep auto-scroll enabled when clicking a note/bookmark
    setAutoScrollEnabled(true);
  };

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

  // Scroll active segment to top whenever it changes (same logic as clicking player)
  useEffect(() => {
    if (autoScrollEnabled && currentBlock?.id && isPlaying) {
      // Use the same scrolling logic as handleScrub
      setTimeout(() => {
        const element = document.querySelector(`[data-block-id="${currentBlock.id}"]`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth', // Smooth scrolling during playback
            block: 'start',
          });
        }
      }, 50);
    }
  }, [currentBlock?.id, autoScrollEnabled, isPlaying]);

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

  const handleSeekBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekBarRef.current || !duration) return;
    
    const rect = seekBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    setHoverTime(Math.max(0, Math.min(time, duration)));
    setHoverPosition(x);
  };

  const handleSeekBarLeave = () => {
    setHoverTime(null);
    setHoverPosition(null);
  };

  const jumpToTimestamp = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
    }
    setCurrentTime(timestamp);
    setIsPlaying(true);
    // Keep auto-scroll enabled when clicking a segment
    setAutoScrollEnabled(true);
  };

  const handleBlockEdit = (id: string, newText: string) => {
    setTranscriptBlocks(
      transcriptBlocks.map((block) =>
        block.id === id ? { ...block, text: newText, words: [] } : block
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
        toast.success('Analysis completed successfully!');
      } else {
        console.error('Analysis failed:', response.statusText);
        toast.error('Analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during analysis:', error);
      toast.error('An error occurred during analysis. Please try again.');
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white">Interview Transcript</h1>
                <p className="text-zinc-400 text-sm">Review, edit, and verify the transcription</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onBackToUpload}
                className="bg-gradient-to-r from-slate-600 to-zinc-600 hover:from-slate-700 hover:to-zinc-700 text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              {existingAnalysis && (
                <Button
                  onClick={onViewAnalysis}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Analysis
                </Button>
              )}
              <Button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                <Sparkles className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : existingAnalysis ? 'Run New Analysis' : 'Run AI Analysis'}
              </Button>
            </div>
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
              <div 
                ref={seekBarRef}
                className="flex-1 relative"
                onMouseMove={handleSeekBarHover}
                onMouseLeave={handleSeekBarLeave}
              >
                <div className="relative w-full h-2 bg-zinc-800 rounded-lg overflow-hidden">
                  <div 
                    className="absolute h-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={currentTime}
                    onChange={handleScrub}
                    className="absolute w-full h-2 appearance-none cursor-pointer bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10"
                  />
                </div>
                {hoverTime !== null && hoverPosition !== null && (
                  <div
                    className="absolute -top-10 transform -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap border border-zinc-700"
                    style={{ left: `${hoverPosition}px` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>
              <span className="text-zinc-400 text-sm min-w-[3rem]">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0 flex">
        <div className="w-full flex">
          <div className="flex w-full h-full">
            {/* Left Side - Notes & Bookmarks (20%) */}
            <div className="border-r border-zinc-800 flex flex-col h-full overflow-hidden bg-zinc-900/10 flex-shrink-0" style={{ width: '20%' }}>
              <div className="p-6 pb-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-zinc-400 text-sm font-medium">Notes & Bookmarks</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => addNote(true)}
                    className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                    title="Add Bookmark"
                  >
                    <Bookmark className="w-4 h-4 text-yellow-400 hover:text-yellow-300 transition-colors" />
                  </button>
                  <button
                    onClick={() => setIsAddingNote(!isAddingNote)}
                    className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                    title="Add Note"
                  > 
                    <Plus className="w-4 h-4 text-blue-400 hover:text-blue-300 transition-colors" />
                  </button>
                </div>
              </div>
              
              {isAddingNote && (
                <div className="px-6 pb-6 flex-shrink-0">
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-700">
                    <Textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Add a note at current time..."
                      style={{
                        backgroundColor: '#27272a',
                        borderColor: '#52525b',
                        padding: '10px 14px',
                        outline: 'none',
                        boxShadow: 'none',
                      }}
                      className="text-sm text-white mb-3"
                      rows={3}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#52525b'}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button
                        onClick={() => {
                          setIsAddingNote(false);
                          setNewNoteContent('');
                        }}
                        size="sm"
                        variant="outline"
                        className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => addNote(false)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                      >
                        <StickyNote className="w-3.5 h-3.5 mr-1.5" />
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <div
                ref={notesScrollRef}
                className="flex-1 overflow-y-auto px-6 pb-6"
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              >
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-8">
                      No notes yet. Click + to add one!
                    </p>
                  ) : (
                    notes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/50 p-3 rounded-lg hover:bg-zinc-900/70 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <button
                            onClick={() => jumpToNote(note.timestamp)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                          >
                            {note.is_bookmark ? <Bookmark className="w-3 h-3 fill-zinc-400 text-zinc-400" /> : <StickyNote className="w-3 h-3 text-zinc-400" />}
                            {formatTime(note.timestamp)}
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-zinc-300 text-sm leading-relaxed">{note.content}</p>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Middle - Transcript (45%) */}
            <div className="border-r border-zinc-800 flex flex-col h-full overflow-hidden flex-shrink-0" style={{ width: '45%' }}>
              <div className="p-8 pb-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-zinc-400 text-sm font-medium">
                  Transcript Segments ({transcriptBlocks.length})
                </h2>
                <span className="text-xs text-zinc-500">
                  Scroll to view all segments
                </span>
              </div>
              <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-8 pt-6 pb-8 scrollbar-hidden" 
                style={{ maxHeight: 'calc(100vh - 260px)' }}
                onWheel={() => setAutoScrollEnabled(false)}
                onTouchMove={() => setAutoScrollEnabled(false)}
              >
                <div className="max-w-3xl space-y-4">
                {transcriptBlocks.map((block, index) => {
                  const isActive = currentBlock?.id === block.id;
                  const isEditing = editingBlockId === block.id;
                  const isHovered = hoveredBlockId === block.id;
                  
                  return (
                    <motion.div
                      key={block.id}
                      data-block-id={block.id}
                      ref={isActive ? activeBlockRef : null}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: 1, 
                        x: 0,
                        scale: isActive ? 1.02 : 1
                      }}
                      transition={{ 
                        duration: 0.3,
                        delay: Math.min(index * 0.03, 1),
                        ease: [0.43, 0.13, 0.23, 0.96]
                      }}
                      whileHover={{ scale: 1.01 }}
                      onMouseEnter={() => setHoveredBlockId(block.id)}
                      onMouseLeave={() => setHoveredBlockId(null)}
                      className={`
                        relative p-4 rounded-lg border transition-all duration-200
                        ${isActive ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'border-zinc-800 bg-zinc-900/30'}
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
                        
                        {isEditing ? (
                          <Textarea
                            value={block.text}
                            onChange={(e) => handleBlockEdit(block.id, e.target.value)}
                            onBlur={() => setEditingBlockId(null)}
                            autoFocus
                            className="min-h-[80px] bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                          />
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
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
                            </div>

                            {isHovered && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setEditingBlockId(block.id)}
                                className="p-2 hover:bg-zinc-800 rounded flex-shrink-0 transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-zinc-400" />
                              </motion.button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Right Side - Info Panel (35%) */}
            <div className="bg-zinc-900/20 p-8 overflow-y-auto h-full flex-shrink-0" style={{ width: '35%' }}>
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

                <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                  <h4 className="text-zinc-300 font-medium mb-3">Confidence Colors</h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-100 font-medium">White</span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-400">High confidence (≥95%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-medium">Light Gray</span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-400">Good confidence (≥85%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-medium">Yellow</span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-400">Medium confidence (≥75%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-medium">Red</span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-400">Low confidence - review!</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 italic">
                    Hover over any word to see exact confidence percentage
                  </p>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-blue-400 mb-3 font-semibold">How to Use</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-white text-sm font-medium mb-2">Transcript</h5>
                      <ul className="text-zinc-300 text-sm space-y-1.5">
                        <li>• Click any timestamp to jump to that point</li>
                        <li>• Click the edit icon to modify text</li>
                        <li>• Active block highlights as audio plays</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-white text-sm font-medium mb-2">Notes & Bookmarks</h5>
                      <ul className="text-zinc-300 text-sm space-y-1.5">
                        <li className="flex items-center gap-1">• Click <Bookmark className="w-3 h-3 text-yellow-400 inline" /> or <Plus className="w-3 h-3 text-blue-400 inline" /> to add bookmark or notes at current time</li>
                        <li>• Click any note/bookmark to jump & play</li>
                        <li>• Hover to delete notes</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-white text-sm font-medium mb-2">Analysis</h5>
                      <ul className="text-zinc-300 text-sm space-y-1.5">
                        <li>• Click "Run AI Analysis" when ready</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
