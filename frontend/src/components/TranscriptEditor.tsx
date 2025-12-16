import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Edit2, Sparkles, Eye, File, FileText, Home, StickyNote, Bookmark, FilePlus2, Trash2, Download, ChevronDown } from 'lucide-react';

import { getJSON, postJSON, authenticatedFetch } from '../utils/api';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { TranscriptBlock, AnalysisData } from '../App';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Virtuoso } from 'react-virtuoso';
import { db, auth } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { TranscriptSegment } from './TranscriptSegment';
import { NoCreditsDialog } from './NoCreditsDialog';

interface Note {
  id: number;
  interview_id: string | number;
  timestamp: number;
  content: string;
  is_bookmark: boolean;
  created_at: string;
  updated_at: string;
}

interface TranscriptEditorProps {
  transcriptBlocks: TranscriptBlock[];
  setTranscriptBlocks: React.Dispatch<React.SetStateAction<TranscriptBlock[]>>;
  onAnalysisComplete: (data: AnalysisData) => void;
  onViewAnalysis: () => void;
  onBackToUpload: () => void;
  audioFile: File | null;
  audioUrl: string | null;
  audioDuration: number | null;
  waveformData: number[] | null;
  existingAnalysis: AnalysisData | null;
  currentInterviewId: string | number | null;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  onSave: () => void;
  onNavigateToSettings: () => void;
}

export function TranscriptEditor({
  transcriptBlocks = [],
  setTranscriptBlocks,
  onAnalysisComplete,
  onViewAnalysis,
  onBackToUpload,
  audioFile,
  audioUrl,
  audioDuration,
  waveformData: waveformDataProp,
  existingAnalysis,
  currentInterviewId,
  notes = [],
  setNotes,
  onSave,
  onNavigateToSettings,
}: TranscriptEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showNoCreditsDialog, setShowNoCreditsDialog] = useState(false);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isGeneratingWaveform, setIsGeneratingWaveform] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBlockRef = useRef<HTMLDivElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const notesScrollRef = useRef<HTMLDivElement | null>(null);
  const virtuosoRef = useRef<any>(null);

  // Notes and Bookmarks state  
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuPosition, setExportMenuPosition] = useState({ top: 0, right: 0 });

  // Create audio URL from file OR use direct URL for streaming
  // Optimized approach: Start with streaming, download chunks in parallel, then switch to blob
  useEffect(() => {
    if (audioFile) {
      // New transcription - create blob URL from file (already local)
      const url = URL.createObjectURL(audioFile);
      setLocalAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (audioUrl) {
      // Existing interview - optimized parallel chunk downloading:
      // 1. Start with streaming URL for instant playback
      setLocalAudioUrl(audioUrl);

      // 2. Download in parallel chunks for 2-5x faster speed
      let blobUrl: string | null = null;
      const abortController = new AbortController();
      let isDownloading = true;

      const downloadWithParallelChunks = async () => {
        try {
          // Optimization: Wait 3s to let the initial stream buffer without competition
          await new Promise(resolve => setTimeout(resolve, 3000));
          if (abortController.signal.aborted) return;

          console.log('🚀 Starting optimized parallel chunk download...');

          // First, get file size by fetching headers only
          const headResponse = await authenticatedFetch(audioUrl, {
            method: 'HEAD',
            signal: abortController.signal
          });
          const fileSize = parseInt(headResponse.headers.get('content-length') || '0');
          const supportsRange = headResponse.headers.get('accept-ranges') === 'bytes';

          if (!supportsRange || fileSize === 0) {
            // Fallback to regular download if Range not supported
            console.log('⚠️ Range requests not supported, falling back to standard download');
            const response = await authenticatedFetch(audioUrl, { signal: abortController.signal });
            const blob = await response.blob();

            if (abortController.signal.aborted) {
              console.log('🛑 Download cancelled before blob creation');
              return;
            }

            blobUrl = URL.createObjectURL(blob);

            // Save state and switch to blob
            const audio = audioRef.current;
            const wasPlaying = audio && !audio.paused;
            const savedTime = audio ? audio.currentTime : 0;

            setLocalAudioUrl(blobUrl);

            // Restore playback state
            setTimeout(() => {
              if (audio && blobUrl) {
                audio.load();
                const restorePlayback = () => {
                  audio.currentTime = savedTime;
                  if (wasPlaying) {
                    audio.play().catch(err => console.error('Failed to resume playback:', err));
                  }
                };
                if (audio.readyState >= 2) {
                  restorePlayback();
                } else {
                  audio.addEventListener('loadeddata', restorePlayback, { once: true });
                }
              }
            }, 100);
            return;
          }

          // Calculate optimal chunk size and count
          const duration = audioDuration || 180; // Fallback to 3 minutes if unknown
          const chunkSize = 2 * 1024 * 1024; // 2MB chunks
          const chunkCount = Math.ceil(fileSize / chunkSize);
          const actualChunks = Math.min(chunkCount, 8); // Max 8 parallel chunks
          const actualChunkSize = Math.ceil(fileSize / actualChunks);

          console.log(`📦 File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB, downloading ${actualChunks} chunks in parallel`);

          // Create chunk ranges
          const chunks = Array.from({ length: actualChunks }, (_, i) => {
            const start = i * actualChunkSize;
            const end = Math.min(start + actualChunkSize - 1, fileSize - 1);
            return { index: i, start, end };
          });

          // Download chunks in parallel (throttled to 3 to leave bandwidth for streaming)
          const batchSize = 3;
          const chunkBlobs: Blob[] = new Array(actualChunks);

          for (let i = 0; i < chunks.length; i += batchSize) {
            if (abortController.signal.aborted) {
              console.log('🛑 Download cancelled during chunk processing');
              return;
            }

            const batch = chunks.slice(i, i + batchSize);
            const batchPromises = batch.map(async (chunk) => {
              const response = await authenticatedFetch(audioUrl, {
                headers: { 'Range': `bytes=${chunk.start}-${chunk.end}` },
                signal: abortController.signal
              });
              if (response.status !== 206) {
                throw new Error('Range request failed');
              }
              const blob = await response.blob();
              chunkBlobs[chunk.index] = blob;
              console.log(`✓ Chunk ${chunk.index + 1}/${actualChunks} downloaded`);
            });
            await Promise.all(batchPromises);
          }

          // Combine all chunks into single blob
          if (abortController.signal.aborted) {
            console.log('🛑 Download cancelled before reassembly');
            return;
          }

          console.log('🔧 Reassembling chunks...');
          const fullBlob = new Blob(chunkBlobs, { type: 'audio/mpeg' });
          blobUrl = URL.createObjectURL(fullBlob);
          console.log('✅ All chunks downloaded and assembled!');

          // Save current playback state before switching
          const audio = audioRef.current;
          const wasPlaying = audio && !audio.paused;
          const savedTime = audio ? audio.currentTime : 0;

          console.log(`💾 Saving state - Time: ${savedTime.toFixed(2)}s, Playing: ${wasPlaying}`);

          // Switch to blob URL for better seeking performance
          setLocalAudioUrl(blobUrl);

          // Wait for audio element to update, then restore playback state
          setTimeout(() => {
            if (audio && blobUrl) {
              // Force audio to load the new source
              audio.load();

              // Wait for audio to be ready
              const restorePlayback = () => {
                audio.currentTime = savedTime;
                console.log(`✅ Restored time to ${savedTime.toFixed(2)}s`);

                if (wasPlaying) {
                  audio.play()
                    .then(() => console.log('▶️ Playback resumed'))
                    .catch(err => console.error('Failed to resume playback:', err));
                }
              };

              // Listen for when audio is ready
              if (audio.readyState >= 2) {
                // Audio already loaded enough data
                restorePlayback();
              } else {
                // Wait for audio to load
                audio.addEventListener('loadeddata', restorePlayback, { once: true });
              }
            }
          }, 100);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('🛑 Audio download aborted by user navigation');
          } else {
            console.error('Failed to download audio chunks, continuing with streaming:', error);
          }
          // Keep using streaming URL if download fails or is cancelled
        } finally {
          isDownloading = false;
        }
      };

      downloadWithParallelChunks();

      // Cleanup: Cancel download and revoke blob URL when navigating away
      return () => {
        if (isDownloading) {
          console.log('🛑 Cancelling audio download...');
          abortController.abort();
        }
        if (blobUrl) {
          console.log('🧹 Cleaning up blob URL');
          URL.revokeObjectURL(blobUrl);
        }
      };
    } else {
      setLocalAudioUrl(null);
    }
  }, [audioFile, audioUrl, audioDuration]);

  // Set stored duration immediately if available (from database)
  useEffect(() => {
    if (audioDuration) {
      setDuration(audioDuration);
    }
  }, [audioDuration]);

  // Use pre-generated waveform from props (from database or transcription)
  useEffect(() => {
    if (waveformDataProp && waveformDataProp.length > 0) {
      console.log('✨ Using pre-generated waveform with', waveformDataProp.length, 'bars');
      setWaveformData(waveformDataProp);
    }
  }, [waveformDataProp]);

  // Generate waveform visualization when audio is cached locally (fallback)
  useEffect(() => {
    const generateWaveform = async () => {
      // Skip if we already have waveform data
      if (waveformData.length > 0) {
        return;
      }

      if (!localAudioUrl || !localAudioUrl.startsWith('blob:') || isGeneratingWaveform) {
        return;
      }

      try {
        setIsGeneratingWaveform(true);
        console.log('🎵 Generating waveform visualization...');

        // Fetch audio data
        const response = await authenticatedFetch(localAudioUrl);
        const arrayBuffer = await response.arrayBuffer();

        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get channel data (use first channel)
        const channelData = audioBuffer.getChannelData(0);
        const samples = 250; // Number of bars to display (increased for more detail)
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        // Calculate RMS (Root Mean Square) for each block for smoother visualization
        for (let i = 0; i < samples; i++) {
          const start = blockSize * i;
          let sum = 0;

          for (let j = 0; j < blockSize; j++) {
            const sample = channelData[start + j];
            sum += sample * sample;
          }

          const rms = Math.sqrt(sum / blockSize);
          waveform.push(rms);
        }

        // Normalize to 0-1 range
        const max = Math.max(...waveform);
        const normalizedWaveform = waveform.map(val => val / max);

        setWaveformData(normalizedWaveform);
        console.log('✅ Waveform generated with 250 bars (high detail)');

        // Save to database if we have an interview ID
        if (currentInterviewId) {
          try {
            await authenticatedFetch(`/v1/interviews/${currentInterviewId}/waveform`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ waveform_data: normalizedWaveform }),
            });
            console.log('💾 Waveform saved to database');
          } catch (err) {
            console.error('Failed to save waveform:', err);
          }
        }
      } catch (error) {
        console.error('Failed to generate waveform:', error);
      } finally {
        setIsGeneratingWaveform(false);
      }
    };

    generateWaveform();
  }, [localAudioUrl, currentInterviewId, waveformData.length]);

  // Firestore Listener for Notes
  useEffect(() => {
    if (!currentInterviewId) return;

    // We need the user UID to construct the path
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const notesRef = collection(db, 'users', user.uid, 'interviews', String(currentInterviewId), 'notes');
        const q = query(notesRef, orderBy('timestamp', 'asc')); // Order by timestamp

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          console.log(`📝 [Firestore] Notes update: ${snapshot.size} docs`);
          const loadedNotes: Note[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            loadedNotes.push({
              id: parseInt(doc.id), // Doc ID matches the Note ID (timestamp-based int)
              interview_id: currentInterviewId,
              timestamp: data.timestamp,
              content: data.content,
              is_bookmark: data.is_bookmark,
              created_at: data.created_at,
              updated_at: data.updated_at
            });
          });
          setNotes(loadedNotes);
        }, (error) => {
          console.error("Firestore Notes Error:", error);
        });

        return () => unsubscribeSnapshot();
      } else {
        setNotes([]);
      }
    });

    return () => unsubscribeAuth();
  }, [currentInterviewId]);

  /* 
  // Legacy Fetch (Removed)
  const fetchNotes = async () => { ... }
  */

  const addNote = async (isBookmark: boolean = false) => {
    if (!newNoteContent.trim() && !isBookmark) return;

    // If no interview ID, store locally
    if (!currentInterviewId) {
      const newNote: Note = {
        id: Date.now(), // Temporary ID
        interview_id: 0,
        timestamp: currentTime,
        content: isBookmark ? `Bookmark at ${formatTime(currentTime)}` : newNoteContent,
        is_bookmark: isBookmark,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNotes([...notes, newNote]);
      setNewNoteContent('');
      setIsAddingNote(false);
      toast.success(isBookmark ? 'Bookmark added!' : 'Note added!');
      return;
    }

    // If interview exists, save to backend
    try {
      const response = await postJSON(`/v1/interviews/${currentInterviewId}/notes`, {
        timestamp: currentTime,
        content: isBookmark ? `Bookmark at ${formatTime(currentTime)}` : newNoteContent,
        is_bookmark: isBookmark,
      });

      if (response.ok) {
        // Don't manually update state - Firestore listener will handle it automatically
        // This prevents duplicate notes from appearing
        console.log('✅ Note saved to backend, Firestore listener will update UI');
      }
      setNewNoteContent('');
      setIsAddingNote(false);
      toast.success(isBookmark ? 'Bookmark added!' : 'Note added!');
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    }
  };

  const deleteNote = async (noteId: number) => {
    // 1. Optimistic UI: Remove from list immediately
    setNotes((prev: Note[]) => prev.filter((n: Note) => n.id !== noteId));

    // Close any potential menus/dialogs associated if needed (none for notes usually)

    // If no interview ID, we are done (local only)
    if (!currentInterviewId) {
      // toast.success('Note deleted!'); // Silent
      return;
    }

    // 2. Background Process: Silent Backend Delete
    try {
      const response = await authenticatedFetch(`/v1/interviews/${currentInterviewId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Background note delete failed');
        toast.error('Failed to sync note deletion');
        // We could revert here, but simpler to just warn.
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to sync note deletion');
    }
  };

  // Export functions
  const exportAsText = () => {
    const text = transcriptBlocks.map(block => block.text).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript exported as TXT');
    setShowExportMenu(false);
  };

  const exportAsJSON = () => {
    const data = {
      transcript: transcriptBlocks,
      notes: notes,
      duration: duration,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript exported as JSON');
    setShowExportMenu(false);
  };

  const exportAsSRT = () => {
    const srtContent = transcriptBlocks.map((block, index) => {
      const startTime = formatSRTTime(block.timestamp);
      const endTime = formatSRTTime(block.timestamp + block.duration);
      return `${index + 1}\n${startTime} --> ${endTime}\n${block.text}\n`;
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript exported as SRT');
    setShowExportMenu(false);
  };

  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  };

  const jumpToNote = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
    }
    setCurrentTime(timestamp);
    setIsPlaying(true); // Update play/pause icon state

    // Find the block for this timestamp and scroll instantly (no animation)
    const targetBlock = transcriptBlocks.find(
      (block) => timestamp >= block.timestamp && timestamp < block.timestamp + block.duration
    ) || transcriptBlocks
      .filter(b => b.timestamp <= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    // Scroll to the target block using Virtuoso
    if (targetBlock && virtuosoRef.current) {
      const blockIndex = transcriptBlocks.findIndex(b => b.id === targetBlock.id);
      if (blockIndex !== -1) {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index: blockIndex,
            behavior: 'auto', // Instant scroll
            align: 'start'
          });
        }, 50);
      }
    }

    // Keep auto-scroll enabled for future playback
    setAutoScrollEnabled(true);
  };

  // Update current time from audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('ended', handleEnded);

    // Try to get duration immediately if already loaded
    if (isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [localAudioUrl]);

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

  // Scroll active segment into view whenever it changes
  useEffect(() => {
    if (autoScrollEnabled && currentBlock?.id && isPlaying && virtuosoRef.current) {
      const blockIndex = transcriptBlocks.findIndex(b => b.id === currentBlock.id);
      if (blockIndex !== -1) {
        // Use a timeout to allow the UI to update before scrolling
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index: blockIndex,
            align: 'center', // Keep the active block centered
            behavior: 'smooth'
          });
        }, 50);
      }
    }
  }, [currentBlock?.id, autoScrollEnabled, isPlaying, transcriptBlocks]);

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
    // This now calls the function that you confirmed works perfectly for notes/bookmarks.
    // It will handle playing, scrolling, and enabling the teleprompter correctly.
    jumpToNote(newTime);
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

  const [credits, setCredits] = useState<number | null>(null);

  // Listen for user credits
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const val = doc.data().credits ?? 0;
        console.log(`💰 [TranscriptEditor] Fetched credits: ${val} (Type: ${typeof val})`);
        setCredits(val);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleRunAnalysis = async () => {
    // Logic: First analysis is free (included in 1 credit). Re-analysis costs 0.5.
    const isReanalysis = !!existingAnalysis;

    // Frontend Credit Check (Only for Re-analysis)
    if (isReanalysis) {
      if (credits !== null && credits < 0.5) {
        setShowNoCreditsDialog(true);
        return;
      }
    }

    setIsAnalyzing(true);

    // Fetch latest analysis settings
    // Default to all blocks if no settings found (ensures prompt_config is always sent)
    const { PROMPT_BLOCKS } = await import('./SettingsScreen');
    // Fetch settings if available, else default
    let promptConfig = PROMPT_BLOCKS.map(b => b.id);
    let modelConfig = 'fast'; // Default to fast

    if (auth.currentUser) {
      try {
        const settingsSnap = await getDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'analysis'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.enabled_blocks) promptConfig = data.enabled_blocks;
          if (data.model_mode) modelConfig = data.model_mode;
        }
      } catch (err) {
        console.warn('Failed to load settings, using defaults', err);
      }
    }

    console.log('🚀 Sending analysis request with config:', { promptConfig, modelConfig });

    try {
      // Use postJSON which handles auth and base URL automatically
      const response = await postJSON('/v1/analyze', {
        transcript_blocks: transcriptBlocks,
        is_reanalysis: isReanalysis,
        prompt_config: promptConfig,
        analysis_mode: modelConfig
      });

      if (!response.ok) {
        if (response.status === 402) {
          setShowNoCreditsDialog(true);
          throw new Error('Insufficient credits for re-analysis.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data: AnalysisData = await response.json();
      onAnalysisComplete(data);
    } catch (error: any) {
      // Don't show toast for credit error since we show dialog
      if (error.message !== 'Insufficient credits for re-analysis.') {
        console.error('Error during analysis:', error);
        toast.error(error.message || 'An error occurred during analysis. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };



  const [wasPlayingBeforeEdit, setWasPlayingBeforeEdit] = useState(false);

  const handleSegmentClick = useCallback((blockId: string | null) => {
    if (blockId === null) {
      setEditingBlockId(null);
      return;
    }
    if (isPlaying) {
      setWasPlayingBeforeEdit(true);
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setWasPlayingBeforeEdit(false);
    }
    setEditingBlockId(blockId);
  }, [isPlaying]);

  const handleEditBlur = useCallback(() => {
    if (wasPlayingBeforeEdit) {
      audioRef.current?.play();
      setIsPlaying(true);
    }
    setEditingBlockId(null);
    setWasPlayingBeforeEdit(false);
  }, [wasPlayingBeforeEdit]);

  const jumpToTimestamp = useCallback((timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
    }
    setCurrentTime(timestamp);

    const audio = audioRef.current;
    if (audio && audio.paused) {
      audio.play();
      setIsPlaying(true);
    }

    setAutoScrollEnabled(true);

    const targetBlock = transcriptBlocks.find(
      (block) => timestamp >= block.timestamp && timestamp < block.timestamp + block.duration
    ) || transcriptBlocks
      .filter(b => b.timestamp <= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (targetBlock) {
      const blockIndex = transcriptBlocks.findIndex(b => b.id === targetBlock.id);
      if (blockIndex !== -1 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index: blockIndex,
          align: 'center',
          behavior: 'smooth'
        });
      }
    }
  }, [transcriptBlocks]);

  const handleBlockEdit = useCallback((id: string, newText: string) => {
    setTranscriptBlocks((prevBlocks: TranscriptBlock[]) =>
      prevBlocks.map((block: TranscriptBlock) =>
        block.id === id ? { ...block, text: newText, words: [] } : block
      )
    );
  }, []);

  const formatTime = useCallback((seconds: number) => {
    // Handle invalid values (NaN, Infinity, negative, etc.)
    if (!isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getConfidenceColor = useCallback((confidence: number): string => {
    // Color words based on confidence: high confidence = white, low = yellow/red
    if (confidence >= 0.95) return 'text-zinc-100';  // High confidence - white
    if (confidence >= 0.85) return 'text-zinc-300';  // Good confidence - light gray
    if (confidence >= 0.75) return 'text-yellow-400'; // Medium confidence - yellow
    return 'text-red-400'; // Low confidence - red
  }, []);

  return (
    <div className="min-h-screen max-h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Hidden Audio Element */}
      {localAudioUrl && (
        <audio ref={audioRef} src={localAudioUrl} preload="metadata" />
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="w-full px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-white text-xl font-bold leading-tight">Interview Transcript</h1>
                <p className="text-zinc-400 text-sm truncate">Review, edit, and verify the transcription</p>
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
              {!currentInterviewId && (
                <Button
                  onClick={onSave}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <StickyNote className="w-4 h-4 mr-2" />
                  Save Interview
                </Button>
              )}
              <Button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                <Sparkles className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : existingAnalysis ? 'Run New Analysis' : 'Run AI Analysis'}
              </Button>

              {/* Export Dropdown */}
              <div style={{ position: 'relative' }}>
                <Button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setExportMenuPosition({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right,
                    });
                    setShowExportMenu(true);
                  }}
                  variant="outline"
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Audio Player */}
      <motion.div
        className="border-b border-zinc-800 bg-zinc-900/30 flex-shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: 0.1,
          ease: [0.43, 0.13, 0.23, 0.96]
        }}
      >
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.2
              }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <Button
                onClick={togglePlayPause}
                variant="outline"
                className="w-12 h-12 rounded-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!localAudioUrl}
                title={!localAudioUrl ? 'No audio available' : ''}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </Button>
            </motion.div>

            <motion.div
              className="flex-1 flex items-center gap-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.2,
                ease: [0.43, 0.13, 0.23, 0.96]
              }}
            >
              <span className="text-zinc-400 text-sm min-w-[3rem]">
                {formatTime(currentTime)}
              </span>
              <div
                ref={seekBarRef}
                className="flex-1 relative"
                onMouseMove={handleSeekBarHover}
                onMouseLeave={handleSeekBarLeave}
              >
                <div className="relative w-full h-12 rounded-lg overflow-hidden">
                  {/* Waveform visualization */}
                  {waveformData.length > 0 ? (
                    <div className="absolute inset-0 flex items-center justify-between px-2 gap-[2px]">
                      {waveformData.map((amplitude, index) => {
                        const progress = (currentTime / duration) * 100;
                        const barProgress = (index / waveformData.length) * 100;
                        const isPlayed = barProgress <= progress;
                        const height = Math.max(amplitude * 100, 4); // Min 4% height

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-center transition-colors duration-150"
                            style={{
                              height: '100%',
                              width: '3px',
                            }}
                          >
                            <div
                              className="w-full rounded-full transition-all duration-150"
                              style={{
                                height: `${height}%`,
                                backgroundColor: isPlayed
                                  ? 'rgb(99, 102, 241)' // Indigo for played
                                  : 'rgb(63, 63, 70)', // Zinc-700 for unplayed
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Skeleton Waveform Loading State
                    <div className="absolute inset-0 flex items-center justify-between px-2 gap-[2px] opacity-50">
                      {Array.from({ length: 60 }).map((_, index) => (
                        <div
                          key={`skeleton-${index}`}
                          className="w-[3px] bg-zinc-700/50 rounded-full animate-pulse"
                          style={{
                            height: `${30 + Math.random() * 40}%`,
                            animationDelay: `${index * 0.01}s`
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Invisible range input for seeking */}
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={currentTime}
                    onChange={handleScrub}
                    className="absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent opacity-0 z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:opacity-100"
                  />

                  {/* Playhead indicator */}
                  {waveformData.length > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-20"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 bg-white rounded-full shadow-lg" />
                    </div>
                  )}
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
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0 flex">
        <div className="w-full flex">
          <div className="flex w-full h-full">
            {/* Left Side - Notes & Bookmarks (20%) */}
            <div className="border-r border-zinc-800 flex flex-col h-full overflow-hidden bg-zinc-900/10 flex-shrink-0" style={{ width: '20%' }}>
              <motion.div
                className="p-6 pb-4 flex items-center justify-between flex-shrink-0"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.43, 0.13, 0.23, 0.96]
                }}
              >
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
                    <FilePlus2 className="w-4 h-4 text-indigo-400 hover:text-indigo-300 transition-colors" />
                  </button>
                </div>
              </motion.div>

              {isAddingNote && (
                <motion.div
                  className="px-6 pb-6 flex-shrink-0"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.43, 0.13, 0.23, 0.96]
                  }}
                >
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
                        e.currentTarget.style.borderColor = '#6366f1';
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
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      >
                        <StickyNote className="w-3.5 h-3.5 mr-1.5" />
                        Save
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              <div
                ref={notesScrollRef}
                className="flex-1 overflow-y-auto px-6 pb-6"
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              >
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <File className="w-8 h-8 text-zinc-600 mx-auto mb-4" />
                      <div className="text-zinc-400 text-sm font-medium mb-1">No notes or bookmarks yet</div>
                      <div className="text-zinc-500 text-xs">Use the buttons above to add notes or bookmarks</div>
                    </div>
                  ) : (
                    notes.map((note, index) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.1,
                          ease: [0.43, 0.13, 0.23, 0.96]
                        }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-zinc-900/50 p-3 rounded-lg hover:bg-zinc-900/70 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <button
                            onClick={() => jumpToNote(note.timestamp)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                          >
                            {note.is_bookmark ? <Bookmark className="w-3 h-3 fill-zinc-400 text-zinc-400" /> : <File className="w-3 h-3 text-zinc-400" />}
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
              <motion.div
                className="p-8 pb-4 flex items-center justify-between flex-shrink-0"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.05,
                  ease: [0.43, 0.13, 0.23, 0.96]
                }}
              >
                <h2 className="text-zinc-400 text-sm font-medium">
                  Transcript Segments ({transcriptBlocks.length})
                </h2>
                <span className="text-xs text-zinc-500">
                  Scroll to view all segments
                </span>
              </motion.div>
              <motion.div
                ref={scrollContainerRef}
                className="flex-1 px-8 pt-6 pb-8 pr-12" // Increased right padding
                style={{ height: 'calc(100vh - 260px)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={transcriptBlocks.length > 0 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Virtuoso
                  ref={virtuosoRef}
                  data={transcriptBlocks}
                  totalCount={transcriptBlocks.length}
                  style={{ height: '100%' }}
                  onWheel={() => setAutoScrollEnabled(false)}
                  onTouchMove={() => setAutoScrollEnabled(false)}
                  components={{
                    List: React.forwardRef<HTMLDivElement, { style?: React.CSSProperties; children?: React.ReactNode }>(({ style, children }, ref) => (
                      <div
                        ref={ref}
                        style={{ ...style, maxWidth: '900px', width: '100%', paddingRight: '16px' }} // Added paddingRight
                      >
                        {children}
                      </div>
                    ))
                  }}
                  context={{
                    currentBlockId: currentBlock?.id,
                    editingBlockId,
                    formatTime,
                    getConfidenceColor,
                    jumpToTimestamp,
                    handleBlockEdit,
                    handleSegmentClick,
                    handleEditBlur,
                    activeBlockRef
                  }}
                  itemContent={(index, block, context) => {
                    return (
                      <TranscriptSegment
                        block={block}
                        isActive={context.currentBlockId === block.id}
                        isEditing={context.editingBlockId === block.id}
                        formatTime={context.formatTime}
                        getConfidenceColor={context.getConfidenceColor}
                        jumpToTimestamp={context.jumpToTimestamp}
                        handleBlockEdit={context.handleBlockEdit}
                        setEditingBlockId={context.handleSegmentClick}
                        onBlur={context.handleEditBlur}
                        activeBlockRef={context.activeBlockRef}
                      />
                    );
                  }}
                />
              </motion.div>
            </div>

            {/* Right Side - Info Panel (35%) */}
            <div className="bg-zinc-900/20 p-8 overflow-y-auto h-full flex-shrink-0" style={{ width: '35%' }}>
              <div className="space-y-6">
                {/* How to Use - Top */}
                <motion.div
                  className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.1
                  }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                  <h4 className="text-indigo-400 mb-3 font-semibold">How to Use</h4>
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
                        <li className="flex items-center gap-1">• Click <Bookmark className="w-3 h-3 text-yellow-400 inline" /> or <FilePlus2 className="w-3 h-3 text-indigo-400 inline" /> to add bookmark or notes at current time</li>
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
                </motion.div>

                {/* Confidence Colors - Middle */}
                <motion.div
                  className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.2
                  }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
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
                </motion.div>

                {/* Statistics - Bottom */}
                <motion.div
                  className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.3
                  }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                  <h4 className="text-zinc-300 font-medium mb-3">Transcript Statistics</h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Total Blocks</span>
                      <span className="text-white font-medium">{transcriptBlocks.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Duration</span>
                      <span className="text-white font-medium">{formatTime(duration)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Word Count</span>
                      <span className="text-white font-medium">
                        {transcriptBlocks.reduce((acc, block) => acc + block.text.split(' ').length, 0)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Menu Portal - This will render the menu outside of the header's stacking context */}
      {showExportMenu && createPortal(
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setShowExportMenu(false)}
          />
          {/* Menu */}
          <div
            style={{
              position: 'fixed',
              top: `${exportMenuPosition.top}px`,
              right: `${exportMenuPosition.right}px`,
              width: '180px',
              backgroundColor: 'rgb(24, 24, 27)',
              border: '1px solid rgb(63, 63, 70)',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
              zIndex: 1000,
              overflow: 'hidden'
            }}
          >
            <button
              onClick={() => { exportAsText(); setShowExportMenu(false); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderBottom: '1px solid rgb(39, 39, 42)',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer'
              }}
              className="bg-transparent hover:bg-zinc-700 transition-colors"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FileText size={14} />
                <span style={{ fontWeight: 500, fontSize: '13px' }}>Plain Text</span>
              </div>
              <div style={{ fontSize: '11px', color: '#a1a1aa', marginLeft: '22px' }}>
                Export as .txt
              </div>
            </button>
            <button
              onClick={() => { exportAsJSON(); setShowExportMenu(false); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderBottom: '1px solid rgb(39, 39, 42)',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer'
              }}
              className="bg-transparent hover:bg-zinc-700 transition-colors"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FileText size={14} />
                <span style={{ fontWeight: 500, fontSize: '13px' }}>JSON</span>
              </div>
              <div style={{ fontSize: '11px', color: '#a1a1aa', marginLeft: '22px' }}>
                With more Info
              </div>
            </button>
            <button
              onClick={() => { exportAsSRT(); setShowExportMenu(false); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer'
              }}
              className="bg-transparent hover:bg-zinc-700 transition-colors"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FileText size={14} />
                <span style={{ fontWeight: 500, fontSize: '13px' }}>SRT</span>
              </div>
              <div style={{ fontSize: '11px', color: '#a1a1aa', marginLeft: '22px' }}>
                For video editing
              </div>
            </button>
          </div>
        </>,
        document.body
      )}

      <NoCreditsDialog
        isOpen={showNoCreditsDialog}
        onClose={() => setShowNoCreditsDialog(false)}
        onNavigateToSettings={onNavigateToSettings}
      />
    </div>
  );
}
