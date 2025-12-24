import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Upload, FileAudio, CheckCircle, Clock, Trash2, AlertTriangle, Menu, X, Settings, Sparkles, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Progress } from './ui/progress';
import { TranscriptBlock } from '../App';
import { toast } from 'sonner';
import { UserMenu } from './UserMenu';
import { authenticatedFetch } from '../utils/api';
import { db, auth } from '../config/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { NoCreditsDialog } from './NoCreditsDialog';
import { useAuth } from '../contexts/AuthContext';

// ... (interfaces)

interface InterviewSummary {
  id: string | number;
  title: string;
  transcript_preview: string;
  created_at: string;
  updated_at: string;
  status?: 'processing' | 'completed' | 'failed';
}

interface UploadScreenProps {
  onTranscriptionComplete: (blocks: TranscriptBlock[], file: File, waveform?: number[], audioUrl?: string, interviewId?: string | number) => void;
  onLoadInterview: (id: string | number) => void;
  onNavigateToBilling: () => void;
  onNavigateToSettings: () => void;
  onNavigateToAdmin: () => void;
}

export function UploadScreen({ onTranscriptionComplete, onLoadInterview, onNavigateToBilling, onNavigateToSettings, onNavigateToAdmin }: UploadScreenProps) {
  const { isAdmin } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  // ... (existing state)

  // ...


  const [isDragging, setIsDragging] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isComplete, setIsComplete] = useState(false);
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredInterviews = useMemo(() => {
    const trimmedQuery = debouncedQuery.trim().toLowerCase();
    if (!trimmedQuery) return interviews;

    return interviews.filter(i => {
      const title = (i.title || '').toLowerCase();
      const preview = (i.transcript_preview || '').toLowerCase();
      const idStr = String(i.id || '').toLowerCase();
      return title.includes(trimmedQuery) || preview.includes(trimmedQuery) || idStr.includes(trimmedQuery);
    });
  }, [interviews, debouncedQuery]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [currentFact, setCurrentFact] = useState("Did you know? AI speech recognition helps make content accessible to everyone.");
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNoCreditsDialog, setShowNoCreditsDialog] = useState(false);
  const [hasDismissedCreditsDialog, setHasDismissedCreditsDialog] = useState(false);

  // Listen for credits with initial fetch
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    // Initial fetch to ensure credits show immediately
    const fetchInitialCredits = async () => {
      try {
        const docSnapshot = await getDoc(userRef);
        if (docSnapshot.exists()) {
          const val = docSnapshot.data().credits || 0;
          setCredits(val);
          console.log(`💰 [Credits] Initial fetch: ${val} credits`);
        }
      } catch (error) {
        console.error('Failed to fetch initial credits:', error);
      }
    };

    // Fetch immediately
    fetchInitialCredits();

    // Then set up real-time listener
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const val = docSnapshot.data().credits || 0;
        setCredits(val);
        console.log(`💰 [Credits] Updated: ${val} credits`);
      }
    });

    return () => unsubscribe();
  }, [hasDismissedCreditsDialog]); // Add hasDismissedCreditsDialog dependency

  // Real-time Firestore Listener
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        setupListener(user.uid);
      } else {
        setInterviews([]);
      }
    });

    let unsubscribeFirestore: () => void;

    const setupListener = (uid: string) => {
      const path = `users/${uid}/interviews`;
      console.log(`📡 [Firestore] Listening to: ${path}`);

      const interviewsRef = collection(db, 'users', uid, 'interviews');
      const q = query(interviewsRef);

      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const loadedInterviews: InterviewSummary[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          loadedInterviews.push({
            id: data.id || doc.id,
            title: data.title || 'Untitled Interview',
            transcript_preview: data.transcript_preview || 'No preview available',
            created_at: data.created_at,
            updated_at: data.updated_at,
            status: data.status
          });
        });

        loadedInterviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setInterviews(loadedInterviews);
      }, (error) => {
        console.error("Firestore Error:", error);
      });
    };

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Warm settings cache on mount
  useEffect(() => {
    const warmSettingsCache = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const settingsRef = doc(db, 'users', user.uid, 'settings', 'analysis');
        const snap = await getDoc(settingsRef);

        if (snap.exists()) {
          const data = snap.data();
          if (data.enabled_blocks) {
            localStorage.setItem('settings_enabled_blocks', JSON.stringify(data.enabled_blocks));
          }
          if (data.model_mode) {
            localStorage.setItem('settings_model_mode', data.model_mode);
          }
          if (data.webhook_secret) {
            localStorage.setItem('settings_webhook_secret', data.webhook_secret);
          }
          console.log('🚀 [Settings] Cache warmed successfully (blocks, mode, secret)');
        }
      } catch (error) {
        console.error('Failed to warm settings cache:', error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) warmSettingsCache();
    });

    return () => unsubscribe();
  }, []);

  const fetchFunFact = async () => {
    try {
      const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
      if (response.ok) {
        const data = await response.json();
        setCurrentFact(data.text);
      }
    } catch (error) {
      console.error("Failed to fetch fact", error);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isTranscribing && !isComplete) {
      fetchFunFact();
      interval = setInterval(() => {
        fetchFunFact();
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [isTranscribing, isComplete]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleDeleteInterview = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId === null) return;
    const idToDelete = deleteConfirmId;
    setDeleteConfirmId(null);
    setInterviews(prev => prev.filter(i => i.id !== idToDelete));

    try {
      const response = await authenticatedFetch(`/v1/interviews/${idToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Background delete failed');
        toast.error('Failed to delete interview on server');
      }
    } catch (error) {
      console.error('Failed to delete interview:', error);
      toast.error('Failed to delete interview on server');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
      setError(null);
      setIsComplete(false);
      setProgress(0);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setIsComplete(false);
      setProgress(0);
    }
  };

  const [pendingInterviewId, setPendingInterviewId] = useState<string | number | null>(null);

  // Poll for completion if we have a pending interview
  useEffect(() => {
    if (!pendingInterviewId || !interviews.length) return;

    const pending = interviews.find(i => String(i.id) === String(pendingInterviewId));
    if (pending && pending.status === 'completed') {
      console.log('✅ Background transcription completed!', pendingInterviewId);

      // Load the full data and call completion
      const finalizeProcessing = async () => {
        try {
          // Fetch full data from backend (optional, but ensures we have everything)
          // or just pull from Firestore
          const response = await authenticatedFetch(`/v1/interviews/${pendingInterviewId}`);
          if (response.ok) {
            const data = await response.json();
            setIsComplete(true);
            setProgress(100);

            setTimeout(() => {
              onTranscriptionComplete(data.transcript_words, file!, data.waveform_data, data.audio_url, pendingInterviewId);
              setPendingInterviewId(null);
              setIsTranscribing(false);
            }, 1000);
          }
        } catch (error) {
          console.error("Failed to finalize background task:", error);
          setError("Failed to load completed transcription.");
          setIsTranscribing(false);
          setPendingInterviewId(null);
        }
      };

      finalizeProcessing();
    } else if (pending && pending.status === 'failed') {
      setError("Transcription failed in background.");
      setIsTranscribing(false);
      setPendingInterviewId(null);
    }
  }, [interviews, pendingInterviewId, file, onTranscriptionComplete]);

  const startTranscription = async () => {
    // Block if no credits
    if (credits !== null && credits <= 0) {
      setShowNoCreditsDialog(true);
      return;
    }
    if (!file) return;

    setIsTranscribing(true);
    setError(null);
    setProgress(-1);

    try {
      const formData = new FormData();
      formData.append("audio_file", file);

      // Use Async Post for transcription
      const response = await authenticatedFetch('/v1/transcribe-async', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `HTTP error! status: ${response.status}`);
      }

      console.log('📡 Transcription queued:', data.interview_id);
      setPendingInterviewId(data.interview_id);
      // We don't set setIsComplete(true) here because it's still processing in background

    } catch (error: any) {
      console.error('Error during transcription init:', error);

      if (error.message && (error.message.includes('Insufficient credits') || error.message.includes('402'))) {
        setShowNoCreditsDialog(true);
        setError(null);
        setIsTranscribing(false);
        setIsComplete(false);
        setProgress(100);
        return;
      }

      setIsTranscribing(false);
      setIsComplete(false);
      setProgress(100);
      setError(error.message || 'An error occurred.');
    }
  };

  return (
    <div className="min-h-screen max-h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="w-full px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileAudio className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-white text-xl font-bold leading-tight">Interview Lens</h1>
                <p className="text-zinc-400 text-sm truncate">AI-Powered Interview Intelligence Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onNavigateToBilling}
                    className="flex items-center gap-2 px-3 h-9 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all group text-left shadow-lg shadow-indigo-500/20"
                  >
                    <div className="bg-white/10 p-1 rounded group-hover:bg-white/20 transition-colors">
                      <Zap className="w-3 h-3 text-white fill-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-indigo-100 font-medium uppercase tracking-wider leading-none">Credits</p>
                      <p className="text-sm text-white font-bold leading-none mt-0.5">{credits !== null ? credits : '-'}</p>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Manage Credits & Subscriptions</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onNavigateToSettings}
                    className="w-9 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 flex items-center justify-center transition-all shadow-lg shadow-cyan-500/20 text-white group"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>

              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onNavigateToAdmin}
                      className="w-9 h-9 rounded-lg bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 flex items-center justify-center transition-all shadow-lg shadow-red-500/20 text-white group"
                    >
                      <Shield className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Admin Dashboard</TooltipContent>
                </Tooltip>
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex bg-zinc-950 overflow-hidden">
        {/* Fixed Sidebar - Previous Interviews */}
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 0 }}
          transition={{
            duration: 0.35,
            ease: 'easeInOut',
            delay: isSidebarOpen ? 0 : 0.2
          }}
          className="border-r border-zinc-800 bg-zinc-900/20 flex-shrink-0 flex flex-col overflow-hidden"
        >
          {/* Sidebar Header */}
          <motion.div
            className="p-4 border-b border-zinc-800/50 flex-shrink-0 flex items-center justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: isSidebarOpen ? 1 : 0 }}
            transition={{
              duration: 0.2,
              delay: isSidebarOpen ? 0.3 : 0
            }}
          >
            <h2 className="text-white text-sm font-semibold">Previous Interviews</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Close Sidebar</TooltipContent>
            </Tooltip>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            className="px-4 pt-4 flex-shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: isSidebarOpen ? 1 : 0 }}
            transition={{
              duration: 0.2,
              delay: isSidebarOpen ? 0.35 : 0
            }}
          >
            <input
              type="text"
              placeholder="Search ..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ boxShadow: 'none', outline: 'none' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = 'none';
              }}
              onBlur={(e) => e.target.style.borderColor = '#27272a'}
              className="w-full px-3 py-2 bg-zinc-900/30 hover:bg-zinc-900/50 focus:bg-zinc-900 border-2 border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-500 transition-all"
            />
          </motion.div>

          {/* Interviews List */}
          <div className="px-4 pt-4 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <div className="space-y-2" style={{ paddingTop: filteredInterviews.length === 0 ? '50px' : '0' }}>
              {filteredInterviews.length === 0 ? (
                <motion.div
                  className="text-center py-12 px-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isSidebarOpen ? 1 : 0, y: isSidebarOpen ? 0 : 10 }}
                  transition={{
                    duration: 0.3,
                    delay: isSidebarOpen ? 0.4 : 0
                  }}
                >
                  {searchQuery ? (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <div className="text-zinc-400 text-sm font-medium mb-1">No interviews found</div>
                      <div className="text-zinc-500 text-xs">Try a different search term</div>
                    </>
                  ) : (
                    <>
                      <FileAudio className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                      <div className="text-zinc-400 text-sm font-medium mb-1">No saved interviews yet</div>
                      <div className="text-zinc-500 text-xs">Upload an audio file to get started</div>
                    </>
                  )}
                </motion.div>
              ) : (
                filteredInterviews.map((interview, index) => (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: isSidebarOpen ? 1 : 0,
                      y: isSidebarOpen ? 0 : 20
                    }}
                    transition={{
                      duration: isSidebarOpen ? 0.4 : 0.2,
                      delay: isSidebarOpen ? 0.4 + (index * 0.1) : 0,
                      ease: [0.43, 0.13, 0.23, 0.96]
                    }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onLoadInterview(interview.id)}
                    className="p-3 hover:bg-zinc-900/50 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white text-sm font-medium truncate group-hover:text-purple-400 transition-colors">
                          {interview.title}
                        </h3>
                        <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">
                          {interview.transcript_preview}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-zinc-600">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(interview.created_at)}</span>
                          {interview.status === 'processing' && (
                            <span className="ml-2 flex items-center gap-1 text-indigo-400 font-medium">
                              <Sparkles className="w-3 h-3 animate-pulse" />
                              Processing...
                            </span>
                          )}
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => handleDeleteInterview(interview.id as number, e)}
                            className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Interview</TooltipContent>
                      </Tooltip>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.aside>

        {/* Main Upload Area */}
        <div className="flex-1 flex flex-col px-8 py-4">
          <div className="w-full flex items-center mb-4 min-h-[40px]">
            <div>
              {!isSidebarOpen && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Open Previous Interviews</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
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
                ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-105' : 'border-zinc-700 bg-zinc-900/50'}
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
              {/* Show if Transcribing, OR Complete, OR Error */}
              {/* Progress Section */}
              {
                (isTranscribing || isComplete || error) && (
                  <motion.div
                    className={`space-y-4 rounded-xl p-6 border transition-colors ${error
                      ? 'bg-red-500/10 border-red-500/30'
                      : isComplete
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-zinc-900/50 border-zinc-800'
                      }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between min-h-[24px]">
                      <span className={`${error ? 'text-red-400' : isComplete ? 'text-green-400' : 'text-zinc-300'
                        } font-medium`}>
                        {error
                          ? 'Upload Failed'
                          : isComplete
                            ? 'Transcription complete!'
                            : <span className="text-xs text-indigo-400 animate-pulse tracking-wide">Transcribing... </span>}
                      </span>
                      {!isComplete && !error && progress > 0 && (
                        <span className="text-xs text-indigo-400 font-medium animate-pulse">
                          {Math.round(progress)}%
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <Progress
                        value={isComplete || error ? 100 : (progress === -1 ? null : progress)}
                        variant={error ? "destructive" : isComplete ? "success" : "default"}
                        className="h-2"
                      />
                    </div>

                    {/* Error Message Display */}
                    {error ? (
                      <div className="pt-2 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300 leading-relaxed">
                          {error}
                        </p>
                      </div>
                    ) : (
                      /* Fun Facts Section */
                      !isComplete && (
                        <div className="pt-2 flex items-start gap-3">
                          <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div className="h-12 overflow-hidden relative w-full">
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={currentFact}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.5 }}
                                className="text-sm text-zinc-400 leading-relaxed absolute w-full"
                              >
                                <span className="text-purple-300 font-medium">Did you know?</span> {currentFact}
                              </motion.p>
                            </AnimatePresence>
                          </div>
                        </div>
                      )
                    )}
                  </motion.div>
                )
              }

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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={startTranscription}
                      disabled={!file || isTranscribing}
                      className={`w-full h-14 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isComplete
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
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
                          {isTranscribing ? 'Processing Audio...' : 'Start Transcription & Analysis'}
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!file ? "Please select a file first" : isTranscribing ? "Processing..." : "Run AI Transcription"}
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            </motion.div >
          </div >
        </div >
      </main >

      {/* Delete Confirmation Modal */}
      {
        deleteConfirmId !== null && typeof document !== 'undefined' && createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '420px',
                margin: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle style={{ width: '24px', height: '24px', color: 'white' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '4px'
                  }}>
                    Delete Interview
                  </h3>
                  <p style={{
                    color: '#a1a1aa',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <p style={{
                color: '#d4d4d8',
                marginBottom: '24px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                Are you sure you want to permanently delete this interview? All analysis data will be lost.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => setDeleteConfirmId(null)}
                  variant="outline"
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  style={{
                    background: 'linear-gradient(to right, #ef4444, #f43f5e)',
                    color: 'white',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #dc2626, #e11d48)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #ef4444, #f43f5e)'}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )
      }

      <NoCreditsDialog
        isOpen={showNoCreditsDialog}
        onClose={() => {
          setShowNoCreditsDialog(false);
          setHasDismissedCreditsDialog(true);
        }}
        onNavigateToBilling={onNavigateToBilling}
      />
    </div>
  );
}
