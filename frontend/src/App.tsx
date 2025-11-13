import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadScreen } from './components/UploadScreen';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';

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

  const handleTranscriptionComplete = (blocks: TranscriptBlock[], file: File) => {
    setTranscriptBlocks(blocks);
    setAudioFile(file);
    setCurrentScreen('editor');
  };

  const handleAnalysisComplete = (data: AnalysisData) => {
    setAnalysisData(data);
    setCurrentScreen('analysis');
  };

  const handleBackToUpload = () => {
    setCurrentScreen('upload');
    setTranscriptBlocks([]);
    setAnalysisData(null);
    setAudioFile(null);
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
    <div className="bg-zinc-950">
      <AnimatePresence mode="wait">
        {currentScreen === 'upload' && (
          <motion.div key="upload" {...pageTransition}>
            <UploadScreen onTranscriptionComplete={handleTranscriptionComplete} />
          </motion.div>
        )}
        {currentScreen === 'editor' && (
          <motion.div key="editor" {...pageTransition}>
            <TranscriptEditor
              transcriptBlocks={transcriptBlocks}
              setTranscriptBlocks={setTranscriptBlocks}
              onAnalysisComplete={handleAnalysisComplete}
              audioFile={audioFile}
            />
          </motion.div>
        )}
        {currentScreen === 'analysis' && analysisData && (
          <motion.div key="analysis" {...pageTransition}>
            <AnalysisDashboard
              analysisData={analysisData}
              transcriptBlocks={transcriptBlocks}
              onBackToUpload={handleBackToUpload}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
