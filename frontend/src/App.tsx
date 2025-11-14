import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadScreen } from './components/UploadScreen';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('upload');
  const [transcriptBlocks, setTranscriptBlocks] = useState<TranscriptBlock[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [currentInterviewId, setCurrentInterviewId] = useState<number | null>(null);
  const [currentInterviewTitle, setCurrentInterviewTitle] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [hasNewAnalysis, setHasNewAnalysis] = useState(false); // Track if analyze button was clicked

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

  const pageTransition = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { 
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  };

  return (
    <div className="bg-zinc-950 h-screen overflow-hidden">
      <Toaster position="bottom-right" />
      <AnimatePresence mode="wait">
        {currentScreen === 'upload' && (
          <motion.div key="upload" {...pageTransition} className="h-full overflow-hidden">
            <UploadScreen 
              onTranscriptionComplete={handleTranscriptionComplete}
              onLoadInterview={handleLoadInterview}
            />
          </motion.div>
        )}
        {currentScreen === 'editor' && (
          <motion.div key="editor" {...pageTransition} className="h-full overflow-hidden">
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
          </motion.div>
        )}
        {currentScreen === 'analysis' && analysisData && (
          <motion.div key="analysis" {...pageTransition} className="h-full overflow-hidden">
            <AnalysisDashboard
              analysisData={analysisData}
              transcriptBlocks={transcriptBlocks}
              onBackToUpload={handleBackToUpload}
              onBackToEditor={handleBackToEditor}
              currentInterviewId={currentInterviewId}
              currentInterviewTitle={currentInterviewTitle}
              onSaveInterview={setCurrentInterviewId}
              audioFile={audioFile}
              notes={notes}
              waveformData={waveformData}
              hasNewAnalysis={hasNewAnalysis}
              onAnalysisSaved={() => {
                setHasNewAnalysis(false);
                console.log('💾 Saved - hasNewAnalysis set to FALSE');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
