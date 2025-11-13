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
  const [currentInterviewId, setCurrentInterviewId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  const handleTranscriptionComplete = (blocks: TranscriptBlock[], file: File) => {
    setTranscriptBlocks(blocks);
    setAudioFile(file);
    setCurrentScreen('editor');
  };

  const handleAnalysisComplete = (data: AnalysisData) => {
    setAnalysisData(data);
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
    setCurrentInterviewId(null);
    setNotes([]);
  };

  const handleLoadInterview = async (interviewId: number) => {
    try {
      // Fetch interview data
      const response = await fetch(`http://127.0.0.1:8000/api/interviews/${interviewId}`);
      const interview = await response.json();
      
      setTranscriptBlocks(interview.transcript_words);
      setAnalysisData(interview.analysis_data);
      setCurrentInterviewId(interviewId);
      
      // Load audio file if it exists
      if (interview.audio_url) {
        try {
          // Use the full URL/path from the database
          const audioResponse = await fetch(`http://127.0.0.1:8000${interview.audio_url}`);
          const audioBlob = await audioResponse.blob();
          // Extract filename from URL
          const filename = interview.audio_url.split('/').pop() || 'audio.mp3';
          const audioFile = new File([audioBlob], filename, { type: audioBlob.type });
          setAudioFile(audioFile);
        } catch (audioErr) {
          console.error('Failed to load audio file:', audioErr);
          // Continue without audio file
          setAudioFile(null);
        }
      } else {
        setAudioFile(null);
      }
      
      setCurrentScreen('editor');
    } catch (err) {
      console.error('Failed to load interview:', err);
      toast.error('Failed to load interview. Please try again.');
    }
  };

  const pageTransition = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { 
      duration: 0.4, 
      ease: [0.43, 0.13, 0.23, 0.96]  // Custom easing for smooth feel
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
              onSaveInterview={setCurrentInterviewId}
              audioFile={audioFile}
              notes={notes}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
