import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadScreen } from './components/UploadScreen';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { LoginPage } from './components/LoginPage';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Save, X } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth } from './config/firebase';
import { db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getJSON, postJSON, postFormData, authenticatedFetch } from './utils/api';
import { ErrorBoundary } from './components/ErrorBoundary';


export type Screen = 'upload' | 'editor' | 'analysis';

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
  interview_id: number;
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
  technicalDepthScore: number;
  engagementScore: number;
}

export interface AnalysisData {
  generalComments: GeneralComments;
  keyPoints: KeyPoint[];
  codingChallenge: CodingChallenge;
  technologies: Technology[];
  qaTopics: QATopic[];
  statistics: Statistics;
  docx_path?: string;
}

// Inner component that uses authentication
function AuthenticatedApp() {
  const { currentUser } = useAuth();

  // Show login page if not authenticated
  if (!currentUser) {
    return <LoginPage />;
  }

  // User is authenticated, show the main app
  return <MainApp />;
}

// Main app logic (extracted from original App component)
function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('upload');
  const [transcriptBlocks, setTranscriptBlocks] = useState<TranscriptBlock[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [currentInterviewId, setCurrentInterviewId] = useState<number | null>(null);
  const [currentInterviewTitle, setCurrentInterviewTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [hasNewAnalysis, setHasNewAnalysis] = useState(false); // Track if analyze button was clicked

  // Pre-fill title when loading existing interview
  useEffect(() => {
    if (currentInterviewTitle) {
      setInterviewTitle(currentInterviewTitle);
    }
  }, [currentInterviewTitle]);

  const handleTranscriptionComplete = (blocks: TranscriptBlock[], file: File, waveform?: number[]) => {
    setTranscriptBlocks(blocks);
    setAudioFile(file);
    setAudioUrl(null); // Clear URL when using new file
    setAudioDuration(null); // Clear stored duration for new file

    // Store waveform data if provided (from backend generation)
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
      // We need to use the latest state, but state updates are async.
      // So we'll construct the update payload directly here.
      const transcriptText = transcriptBlocks.map(block => block.text).join(' ');

      const updateInterview = async () => {
        try {
          const requestBody = {
            interview_id: currentInterviewId,
            title: currentInterviewTitle, // Keep existing title
            transcript_text: transcriptText,
            transcript_words: transcriptBlocks,
            analysis_data: dataWithTimestamp,
          };

          const response = await authenticatedFetch(`/api/interviews/${currentInterviewId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          if (response.ok) {
            console.log('✅ Auto-update successful');
            toast.success('Interview updated with new analysis');
            setHasNewAnalysis(false); // It's already saved
          } else {
            console.error('❌ Auto-update failed');
          }
        } catch (err) {
          console.error('❌ Auto-update error:', err);
        }
      };

      updateInterview();
    } else {
      // New interview (not saved yet) - just show analysis complete
      toast.success('Analysis completed successfully!');
    }
  };

  const handleAnalysisSaved = () => {
    setHasNewAnalysis(false);
  };

  const handleSaveInterview = async () => {
    if (!interviewTitle.trim()) {
      toast.error('Please enter a title for this interview');
      return;
    }

    setIsSaving(true);
    try {
      const transcriptText = transcriptBlocks.map(block => block.text).join(' ');
      if (currentInterviewId) {
        // UPDATE
        const requestBody = {
          interview_id: currentInterviewId,
          title: interviewTitle,
          transcript_text: transcriptText,
          transcript_words: transcriptBlocks,
          analysis_data: analysisData,
        };
        const response = await authenticatedFetch(`/api/interviews/${currentInterviewId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        if (response.ok) {
          handleAnalysisSaved();
          setShowSaveDialog(false);
          setCurrentInterviewTitle(interviewTitle);
          toast.success('Interview updated successfully!');
        } else {
          toast.error('Failed to update interview.');
        }
      } else {
        // CREATE
        const formData = new FormData();
        formData.append('title', interviewTitle);
        formData.append('transcript_text', transcriptText);
        formData.append('transcript_words', JSON.stringify(transcriptBlocks));
        if (analysisData) {
          formData.append('analysis_data', JSON.stringify(analysisData));
        } else {
          // Provide empty analysis structure if saving before analysis
          formData.append('analysis_data', JSON.stringify({
            generalComments: { howInterview: '', attitude: '', structure: '', platform: '' },
            keyPoints: [],
            codingChallenge: { coreExercise: '', followUp: '', knowledge: '' },
            technologies: [],
            qaTopics: [],
            statistics: {
              duration: '0:00', technicalTime: '0:00', qaTime: '0:00',
              technicalQuestions: 0, followUpQuestions: 0, technologiesCount: 0,
              complexity: 'Intermediate', pace: 'Moderate', engagement: 0,
              communicationScore: 0, technicalDepthScore: 0, engagementScore: 0
            }
          }));
        }

        // Add notes if available
        if (notes.length > 0) {
          formData.append('notes', JSON.stringify(notes));
        }

        // Add waveform data if available
        if (waveformData && waveformData.length > 0) {
          formData.append('waveform_data', JSON.stringify(waveformData));
        }

        // Add audio file if available
        if (audioFile) {
          formData.append('audio_file', audioFile);
        }
        const response = await postFormData('/api/interviews', formData);
        if (response.ok) {
          const result = await response.json();
          setCurrentInterviewId(result.id);
          setCurrentInterviewTitle(interviewTitle);
          handleAnalysisSaved();
          setShowSaveDialog(false);
          toast.success('Interview saved successfully!');
        } else {
          toast.error('Failed to save interview.');
        }
      }
    } catch (error) {
      toast.error('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
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
  const handleLoadInterview = (interviewId: number) => {
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
  const fetchInterviewData = async (interviewId: number) => {
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

        // interviewData.audio_url is the relative path stored by backend e.g. "/api/audio/..."
        const baseUrl = `http://127.0.0.1:8000${interviewData.audio_url}`;
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

  const handleInterviewSaved = (id: number) => {
    setCurrentInterviewId(id);
    setHasNewAnalysis(false);
    console.log('✅ Interview saved/updated, ID:', id);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
      <Toaster position="bottom-right" theme="dark" />
      {currentScreen === 'upload' && (
        <UploadScreen
          onTranscriptionComplete={handleTranscriptionComplete}
          onLoadInterview={handleLoadInterview}
        />
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
            onSaveInterview={handleInterviewSaved} // Use the state updater, not the API caller
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
                  onClick={handleSaveInterview}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
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
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
