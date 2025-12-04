import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadScreen } from './components/UploadScreen';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Save, X } from 'lucide-react';


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

function App() {
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
        const response = await fetch(`http://127.0.0.1:8000/api/interviews/${currentInterviewId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        if (response.ok) {
          handleAnalysisSaved();
          setShowSaveDialog(false);
          toast.success('Interview updated successfully!');
        } else {
          toast.error('Failed to update interview.');
        }
      } else {
        // CREATE
        const formData = new FormData();
        formData.append('title', interviewTitle);
        // ... (append other form data: transcript, analysis, notes, etc.)
        const response = await fetch('http://127.0.0.1:8000/api/interviews', {
          method: 'POST',
          body: formData,
        });
        if (response.ok) {
          const result = await response.json();
          setCurrentInterviewId(result.id);
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

  const handleLoadInterview = async (interviewId: number) => {
    console.time('Load Interview');
    try {
      // Fetch interview data
      console.time('Fetch Interview Data');
      const response = await fetch(`http://127.0.0.1:8000/api/interviews/${interviewId}`);
      const interview = await response.json();
      console.timeEnd('Fetch Interview Data');
      
      console.time('Set State');
      setTranscriptBlocks(interview.transcript_words);
      setAnalysisData(interview.analysis_data);
      setCurrentInterviewId(interviewId);
      setCurrentInterviewTitle(interview.title || '');
      
      // Use audio URL directly for streaming - no download needed!
      // Browser handles streaming automatically
      setAudioFile(null);
      if (interview.audio_url) {
        setAudioUrl(`http://127.0.0.1:8000${interview.audio_url}`);
      } else {
        setAudioUrl(null);
      }
      
      // Set stored audio duration if available
      if (interview.audio_duration) {
        setAudioDuration(interview.audio_duration);
      } else {
        setAudioDuration(null);
      }
      
      // Set waveform data if available (from database)
      if (interview.waveform_data && interview.waveform_data.length > 0) {
        setWaveformData(interview.waveform_data);
        console.log('✨ Loaded waveform from database with', interview.waveform_data.length, 'bars');
      } else {
        setWaveformData(null);
      }
      
      console.timeEnd('Set State');
      
      // Small delay to let state settle before transition
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Show the screen immediately - audio will stream when played
      console.log('Setting screen to editor');
      setCurrentScreen('editor');
      console.timeEnd('Load Interview');
    } catch (err) {
      console.error('Failed to load interview:', err);
      toast.error('Failed to load interview. Please try again.');
      console.timeEnd('Load Interview');
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

  return (
    <div className="bg-zinc-950 text-white">
      <Toaster position="bottom-right" />
      
      {currentScreen === 'upload' && (
        <UploadScreen 
          onTranscriptionComplete={handleTranscriptionComplete}
          onLoadInterview={handleLoadInterview}
        />
      )}
      {currentScreen === 'editor' && (
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
        />
      )}
      {currentScreen === 'analysis' && analysisData && (
        <AnalysisDashboard
          analysisData={analysisData}
          transcriptBlocks={transcriptBlocks}
          onBackToUpload={handleBackToUpload}
          onBackToEditor={handleBackToEditor}
          currentInterviewId={currentInterviewId}
          currentInterviewTitle={currentInterviewTitle}
          onSaveInterview={handleSaveInterview} // Using the correctly typed handler
          audioFile={audioFile}
          notes={notes}
          waveformData={waveformData}
          hasNewAnalysis={hasNewAnalysis}
          onAnalysisSaved={() => {
            setHasNewAnalysis(false);
          }}
        />
      )}
      
      {/* Save Interview Dialog, now managed by App.tsx */}
      {showSaveDialog && createPortal(
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
              <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="border-zinc-600 hover:bg-zinc-700">
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
      )}
    </div>
  );
}

export default App;
