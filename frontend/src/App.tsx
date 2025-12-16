import React, { useState, useEffect } from 'react';
import { SettingsScreen } from './components/SettingsScreen';

export type Screen = 'upload' | 'editor' | 'analysis' | 'settings' | 'analysis-settings' | 'admin';

// ... (existing code)

import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadScreen } from './components/UploadScreen';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { LoginPage } from './components/LoginPage';
import { VerifyEmail } from './components/VerifyEmail';
import { EmailVerificationPending } from './components/EmailVerificationPending';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Save, X } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { db, auth } from './config/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, setDoc } from 'firebase/firestore';
import { authenticatedFetch, API_BASE_URL } from './utils/api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BillingScreen } from './components/BillingScreen';
import { AdminScreen } from './components/AdminScreen';

export interface Word {
  text: string;
  confidence: number;
}

export interface TranscriptBlock {
  id: string;
  timestamp: number;
  duration: number;
  text: string;
  words?: Word[];
  speaker?: string;
}

export interface Note {
  id: number;
  interview_id: string | number;
  timestamp: number;
  content: string;
  is_bookmark: boolean;
  created_at: string;
  updated_at: string;
}

export interface Technology {
  name: string;
  timestamps?: string;
}

export interface KeyPoint {
  title: string;
  content: string;
}

export interface QATopic {
  title: string;
  content: string;
}

export interface GeneralComments {
  howInterview: string;
  attitude: string;
  structure: string;
  platform: string;
}

export interface CodingChallenge {
  coreExercise: string;
  followUp: string;
  knowledge: string;
}

export interface Statistics {
  duration: string;
  technicalTime: string;
  qaTime: string;
  technicalQuestions: number;
  followUpQuestions: number;
  technologiesCount: number;
  complexity: string;
  pace: string;
  engagement: number;
  communicationScore: number;
  communicationScoreExplanation?: string;
  technicalDepthScore: number;
  technicalDepthScoreExplanation?: string;
  engagementScore: number;
  engagementScoreExplanation?: string;
}

export interface AnalysisData {
  executiveSummary?: string;
  generalComments?: GeneralComments;
  strengthsWeaknesses?: {
    strengths: string[];
    weaknesses: string[];
  };
  thinkingProcess?: {
    methodology: string;
    edgeCaseHandling: number;
    edgeCaseExplanation: string;
    structureScore: number;
    structureExplanation: string;
  };
  keyPoints?: KeyPoint[];
  codingChallenge?: CodingChallenge;
  technologies?: Technology[];
  qaTopics?: QATopic[];
  statistics?: Statistics;
  docx_path?: string;
}

// Inner component that uses authentication
function AuthenticatedApp() {
  const { currentUser } = useAuth();
  const location = useLocation();

  // Allow Verification Route bypassing Auth check
  if (location.pathname === '/verify-email') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
        <VerifyEmail />
        <Toaster position="bottom-right" theme="dark" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!currentUser) {
    return <LoginPage />;
  }

  // User is authenticated, show the main app
  return <MainApp />;
}

// Main app logic (extracted from original App component)
function MainApp() {
  const { currentUser, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('upload');
  const [transcriptBlocks, setTranscriptBlocks] = useState<TranscriptBlock[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [currentInterviewId, setCurrentInterviewId] = useState<string | number | null>(null);
  const [currentInterviewTitle, setCurrentInterviewTitle] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState('');
  const [preUploadedAudioUrl, setPreUploadedAudioUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [hasNewAnalysis, setHasNewAnalysis] = useState(false); // Track if analyze button was clicked

  // Sync user data with backend (initializes credits for new users)
  // IMPORTANT: Only call after email is verified, otherwise middleware blocks it
  useEffect(() => {
    const syncUser = async () => {
      // Only sync if email is verified
      if (!currentUser?.emailVerified) {
        console.log('⏸️ Skipping user sync - email not verified yet');
        return;
      }

      try {
        console.log('🔄 Syncing user with backend...');
        await authenticatedFetch('/v1/auth/me');
        console.log('✅ User synced with backend - credits initialized');
      } catch (error) {
        console.error('Failed to sync user:', error);
      }
    };

    if (currentUser) {
      syncUser();
    }
  }, [currentUser]); // Trigger on currentUser change (includes initial login)

  // Handle Stripe Redirects
  // Handle Query Params (Stripe Success & Email Verification)
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);

    // Stripe Success
    if (query.get('success')) {
      toast.success('Credits added successfully!');
      window.history.replaceState({}, document.title, "/");
    }

    // Email Verified via Custom Handler
    if (query.get('verified')) {
      toast.success('Email verified successfully!');
      window.history.replaceState({}, document.title, "/");

      // Force reload user to update UI state if needed
      if (currentUser) {
        currentUser.reload().then(() => {
          currentUser.getIdToken(true); // refresh token
        }).catch(e => console.error(e));
      }
    }

    // Stripe Canceled
    if (query.get('canceled')) {
      toast.error('Payment canceled');
      window.history.replaceState({}, document.title, "/");
    }
  }, [currentUser]);

  // Handle Stripe Redirects

  const handleNavigateToSettings = () => {
    setCurrentScreen('settings');
  };

  const handleNavigateToAnalysisConfig = () => {
    setCurrentScreen('analysis-settings');
  };

  // Pre-fill title when loading existing interview
  useEffect(() => {
    if (currentInterviewTitle) {
      setInterviewTitle(currentInterviewTitle);
    }
  }, [currentInterviewTitle]);

  const handleTranscriptionComplete = (transcript: TranscriptBlock[], file: File, waveform?: number[], audioUrl?: string) => {
    setTranscriptBlocks(transcript);
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url); // Local blob for immediate playback
    if (audioUrl) {
      console.log('✅ Received pre-uploaded audio URL:', audioUrl);
      setPreUploadedAudioUrl(audioUrl); // Remote URL for saving
    } else {
      console.warn('⚠️ No pre-uploaded audio URL received');
    }

    // Calculate duration from last timestamp
    if (transcript.length > 0) {
      const lastBlock = transcript[transcript.length - 1];
      setAudioDuration(lastBlock.timestamp + lastBlock.duration);
    }

    if (waveform && waveform.length > 0) {
      setWaveformData(waveform);
      console.log('✨ Received waveform from backend with', waveform.length, 'bars');
    } else {
      setWaveformData(null);
    }

    setCurrentScreen('editor');
  };

  const handleAnalysisComplete = (data: AnalysisData) => {
    // Add timestamp to force re-render and detection of new analysis
    const dataWithTimestamp = {
      ...data,
      _analysisTimestamp: Date.now()
    };
    console.log('📊 New analysis complete with timestamp:', dataWithTimestamp._analysisTimestamp);
    setAnalysisData(dataWithTimestamp as AnalysisData);
    setHasNewAnalysis(true); // Mark that analyze button was clicked
    console.log('✅ hasNewAnalysis set to TRUE');
    setCurrentScreen('analysis');

    // Auto-update if interview already exists
    if (currentInterviewId) {
      console.log('🔄 Auto-updating existing interview with new analysis...');

      const updateAnalysis = async () => {
        try {
          const uid = auth.currentUser?.uid;
          if (!uid) return;

          // Update Analysis Subcollection
          const analysisRef = doc(db, 'users', uid, 'interviews', String(currentInterviewId), 'data', 'analysis');
          await setDoc(analysisRef, dataWithTimestamp, { merge: true }); // set/merge is safer than update if doc missing

          // Update Metadata (timestamp)
          const interviewRef = doc(db, 'users', uid, 'interviews', String(currentInterviewId));
          await setDoc(interviewRef, { updated_at: new Date().toISOString() }, { merge: true });

          console.log('✅ Auto-update successful (Firestore)');
          toast.success('Interview updated with new analysis');
          setHasNewAnalysis(false);
        } catch (err) {
          console.error('❌ Auto-update error:', err);
        }
      };

      updateAnalysis();
    } else {
      // New interview (not saved yet) - just show analysis complete
      toast.success('Analysis completed successfully!');
    }
  };

  const handleAnalysisSaved = () => {
    setHasNewAnalysis(false);
  };

  const handleSaveInterview = async (titleOverride?: string | number) => {
    // Determine title: override (if string) or state
    const titleToUse = (typeof titleOverride === 'string' && titleOverride) ? titleOverride : interviewTitle;

    if (!titleToUse.trim()) {
      toast.error('Please enter a title for this interview');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be logged in to save.");
      return;
    }

    // 1. Optimistic UI: Close immediately
    console.time('Save Dialog Close');
    setShowSaveDialog(false);
    console.timeEnd('Save Dialog Close');

    // 2. Start Background Process
    const savePromise = async () => {
      console.time('Save Promise Start');
      const uid = user.uid;
      // If creating new, generate ID. If updating, use existing.
      const interviewId = currentInterviewId || Date.now();
      const now = new Date().toISOString();
      const transcriptText = transcriptBlocks.map(block => block.text).join(' ');
      const preview = transcriptText.slice(0, 200) + (transcriptText.length > 200 ? '...' : '');

      const batch = writeBatch(db);

      // --- 1. Main Document (Metadata) ---
      const interviewRef = doc(db, 'users', uid, 'interviews', String(interviewId));
      const interviewData: any = {
        id: interviewId,
        title: titleToUse,
        transcript_preview: preview,
        updated_at: now,
      };

      if (!currentInterviewId) {
        interviewData.created_at = now;
      }

      // If we have a pre-uploaded audio URL, finalize it (move from temp to perm)
      if (preUploadedAudioUrl) {
        let finalAudioUrl = preUploadedAudioUrl;

        // Only call finalize if it looks like a temp URL
        if (preUploadedAudioUrl.includes('/temp/')) {
          try {
            console.log('📦 Finalizing audio file...');
            const finalizeRes = await authenticatedFetch('/v1/audio/finalize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_url: preUploadedAudioUrl })
            });

            if (finalizeRes.ok) {
              const data = await finalizeRes.json();
              finalAudioUrl = data.audio_url;
              console.log('✅ Audio finalized:', finalAudioUrl);
            } else {
              console.warn('⚠️ Audio finalization failed. Using temp URL.', await finalizeRes.text());
            }
          } catch (e) {
            console.error('Finalize error:', e);
          }
        }

        interviewData.audio_url = finalAudioUrl;
      }

      // Calculate Duration
      if (transcriptBlocks.length > 0) {
        const last = transcriptBlocks[transcriptBlocks.length - 1];
        interviewData.audio_duration = last.timestamp + last.duration;
      }

      batch.set(interviewRef, interviewData, { merge: true });

      // --- 2. Sub-collections ---
      // Transcript
      const transcriptRef = doc(db, 'users', uid, 'interviews', String(interviewId), 'data', 'transcript');
      batch.set(transcriptRef, {
        text: transcriptText,
        words: transcriptBlocks
      });

      // Analysis
      if (analysisData) {
        const analysisRef = doc(db, 'users', uid, 'interviews', String(interviewId), 'data', 'analysis');
        batch.set(analysisRef, analysisData);
      }

      // Waveform
      if (waveformData && waveformData.length > 0) {
        const waveformRef = doc(db, 'users', uid, 'interviews', String(interviewId), 'data', 'waveform');
        batch.set(waveformRef, { data: waveformData });
      }

      // Notes
      if (notes.length > 0) {
        notes.forEach(note => {
          const noteId = note.id;
          const noteRef = doc(db, 'users', uid, 'interviews', String(interviewId), 'notes', String(noteId));
          batch.set(noteRef, { ...note, interview_id: interviewId });
        });
      }

      // --- 3. Commit Firestore Data ---
      console.log('💾 Committing batch to Firestore...', {
        id: interviewId,
        blocks: transcriptBlocks.length,
        audioUrl: preUploadedAudioUrl
      });
      await batch.commit();
      console.timeEnd('Save Promise Start');

      // --- 4. Upload Audio to Backend (Hybrid/Fallback) ---
      // REMOVED per user request to rely 100% on concurrent upload. 
      // If preUploadedAudioUrl is missing, we log a warning but don't block.
      if (!preUploadedAudioUrl && audioFile) {
        console.warn('⚠️ Audio file exists but NO pre-uploaded URL. Audio might be missing on cloud.');
        // Optional: Add toast warning?
      }

      return interviewId;
    };

    // Yield to UI loop to ensure dialog closes visually first
    setTimeout(() => {
      toast.promise(savePromise(), {
        loading: 'Saving interview in background...',
        success: (id) => {
          // Update state after success
          setCurrentInterviewId(id);
          setCurrentInterviewTitle(titleToUse);
          handleAnalysisSaved();
          setAudioFile(null); // Clear file as it's saved
          setPreUploadedAudioUrl(null); // Clear URL
          return 'Interview saved successfully!';
        },
        error: 'Failed to save interview'
      });
    }, 0);
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      // ... fetch logic for download ...
    } catch (error) {
      toast.error('An error occurred while downloading the report.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBackToEditor = () => {
    setCurrentScreen('editor');
  };

  const handleBackToUpload = () => {
    setCurrentScreen('upload');
    setTranscriptBlocks([]);
    setAnalysisData(null);
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(null);
    setWaveformData(null);
    setCurrentInterviewId(null);
    setCurrentInterviewTitle('');
    setNotes([]);
    setHasNewAnalysis(false); // Clear flag when going home
    console.log('🏠 Going home - hasNewAnalysis set to FALSE');
  };

  // Optimistic Navigation: Switch screen immediately
  const handleLoadInterview = (interviewId: string | number) => {
    console.log('🚀 Optimistic Load: Switching to editor immediately');
    setCurrentInterviewId(interviewId);
    setCurrentScreen('editor');

    // Clear previous data to show skeleton state
    setTranscriptBlocks([]);
    setAnalysisData(null);
    setAudioUrl(null);
    setAudioDuration(null);
    setWaveformData(null);

    // Fetch data in background
    fetchInterviewData(interviewId);
  };

  // Inside App component
  const fetchInterviewData = async (interviewId: string | number) => {
    console.time('Fetch Interview Data (Firestore)');
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Construct references
      // Path: users/{uid}/interviews/{interviewId}
      // Sub-collections: data/transcript, data/analysis, data/waveform
      const interviewRef = doc(db, 'users', user.uid, 'interviews', String(interviewId));
      const transcriptRef = doc(db, 'users', user.uid, 'interviews', String(interviewId), 'data', 'transcript');
      const analysisRef = doc(db, 'users', user.uid, 'interviews', String(interviewId), 'data', 'analysis');
      const waveformRef = doc(db, 'users', user.uid, 'interviews', String(interviewId), 'data', 'waveform');

      // Parallel fetch
      const [interviewSnap, transcriptSnap, analysisSnap, waveformSnap] = await Promise.all([
        getDoc(interviewRef),
        getDoc(transcriptRef),
        getDoc(analysisRef),
        getDoc(waveformRef)
      ]);

      console.timeEnd('Fetch Interview Data (Firestore)');

      if (!interviewSnap.exists()) {
        toast.error("Interview not found");
        return;
      }

      const interviewData = interviewSnap.data();
      const transcriptData = transcriptSnap.exists() ? transcriptSnap.data() : {};
      const analysisData = analysisSnap.exists() ? analysisSnap.data() : null; // Analysis might be null
      const waveformDocData = waveformSnap.exists() ? waveformSnap.data() : {};

      // Race condition check: user might have switched away
      /* 
         Note: In a real app, we should check a ref or state. 
         But typically we want to update the cache/store regardless.
      */

      // Set Transcript
      // Firestore stores it as { text: "...", words: [...] }
      const words = transcriptData.words || [];
      console.log(`📝 Loaded ${words.length} transcript words from Firestore`);
      setTranscriptBlocks(words);

      // Set Analysis
      setAnalysisData(analysisData as AnalysisData | null);

      // Set Title
      setCurrentInterviewTitle(interviewData.title || '');

      // Handle Audio URL
      setAudioFile(null);
      if (interviewData.audio_url) {
        let token = '';
        try {
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
          }
        } catch (e) {
          console.error('Failed to get token for audio stream:', e);
        }

        // interviewData.audio_url is the relative path stored by backend e.g. "/v1/audio/..."
        const baseUrl = `${API_BASE_URL}${interviewData.audio_url}`;
        setAudioUrl(token ? `${baseUrl}?token=${token}` : baseUrl);
      } else {
        setAudioUrl(null);
      }

      // Set Duration
      if (interviewData.audio_duration) {
        setAudioDuration(interviewData.audio_duration);
      }

      // Set Waveform
      // Firestore stores as { data: [...] }
      if (waveformDocData.data && waveformDocData.data.length > 0) {
        setWaveformData(waveformDocData.data);
      }

    } catch (err) {
      console.error('Failed to load interview from Firestore:', err);
      toast.error('Failed to load interview. Please try again.');
    }
  };

  const handleShowSaveDialog = () => {
    // This logic now moves to App.tsx
    // For now, we'll just log it.
    console.log('Show save dialog triggered');
  };

  const pageTransition = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  };

  const motionProps = {
    variants: pageTransition,
    initial: "initial",
    animate: "animate",
    exit: "exit"
  };

  const handleInterviewSaved = (id: string) => {
    setCurrentInterviewId(id);
    setHasNewAnalysis(false);
    console.log('✅ Interview saved/updated, ID:', id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  // Check verification status
  if (!currentUser.emailVerified) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
        <EmailVerificationPending />
        <Toaster position="bottom-right" theme="dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
      <Toaster position="bottom-right" theme="dark" />
      {currentScreen === 'upload' && (
        <UploadScreen
          onTranscriptionComplete={handleTranscriptionComplete}
          onLoadInterview={handleLoadInterview}
          onNavigateToSettings={handleNavigateToSettings}
          onNavigateToAnalysisConfig={handleNavigateToAnalysisConfig}
          onNavigateToAdmin={() => setCurrentScreen('admin')}
        />
      )}
      {currentScreen === 'settings' && (
        <BillingScreen onBack={handleBackToUpload} />
      )}
      {currentScreen === 'analysis-settings' && (
        <SettingsScreen onBack={handleBackToUpload} />
      )}
      {currentScreen === 'admin' && (
        <AdminScreen onBack={handleBackToUpload} />
      )}
      {currentScreen === 'editor' && (
        <ErrorBoundary>
          <TranscriptEditor
            transcriptBlocks={transcriptBlocks}
            setTranscriptBlocks={setTranscriptBlocks}
            onAnalysisComplete={handleAnalysisComplete}
            onViewAnalysis={() => setCurrentScreen('analysis')}
            onBackToUpload={handleBackToUpload}
            audioFile={audioFile}
            audioUrl={audioUrl}
            audioDuration={audioDuration}
            waveformData={waveformData}
            existingAnalysis={analysisData}
            currentInterviewId={currentInterviewId}
            notes={notes}
            setNotes={setNotes}
            onSave={() => setShowSaveDialog(true)}
            onNavigateToSettings={handleNavigateToSettings}
          />
        </ErrorBoundary>
      )}
      {
        currentScreen === 'analysis' && analysisData && (
          <AnalysisDashboard
            analysisData={analysisData}
            transcriptBlocks={transcriptBlocks}
            onBackToUpload={handleBackToUpload}
            onBackToEditor={handleBackToEditor}
            currentInterviewId={currentInterviewId}
            currentInterviewTitle={currentInterviewTitle}
            onSaveInterview={(input: string | number) => handleSaveInterview(input)}
            audioFile={audioFile}
            notes={notes}
            waveformData={waveformData}
            hasNewAnalysis={hasNewAnalysis}
            onAnalysisSaved={() => {
              setHasNewAnalysis(false);
            }}
          />
        )
      }

      {/* Save Interview Dialog, now managed by App.tsx */}
      {
        showSaveDialog && createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-zinc-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Save Interview</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSaveDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-zinc-400 mb-4">Please provide a title for this interview session.</p>
              <Input
                type="text"
                placeholder="e.g., Senior Frontend Engineer Interview"
                value={interviewTitle}
                onChange={(e) => setInterviewTitle(e.target.value)}
                className="w-full bg-zinc-900 border-zinc-700 text-white"
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="border-zinc-600 hover:bg-zinc-700 text-zinc-300">
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSaveInterview()}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Interview
                </Button>
              </div>
            </motion.div>
          </div>,
          document.body
        )
      }
    </div >
  );
}

// Main App component with AuthProvider
function App() {
  // Warm up backend
  useEffect(() => {
    // We use the authenticatedFetch's base URL logic or just imports
    // But since this is outside AuthProvider/context, simpler to just use fetch with env var if possible
    // or just hardcode the likely prod URL if env is tricky to access here.
    // However, we imported API_BASE_URL from utils/api in this file!
    const ping = async () => {
      try {
        await fetch(`${API_BASE_URL}/v1/health`);
      } catch (e) {
        // quiet fail
      }
    };
    ping();
  }, []);

  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
