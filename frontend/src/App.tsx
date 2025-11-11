import { useState } from 'react';
import { UploadScreen } from './components/UploadScreen';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDashboard } from './components/AnalysisDashboard';

export type Screen = 'upload' | 'editor' | 'analysis';

export interface TranscriptBlock {
  id: string;
  timestamp: number;
  duration: number;
  text: string;
}

export interface AnalysisData {
  bestFitRole: string;
  communicationScore: number;
  technicalDebtRisk: string;
  softSkillSummary: {
    leadership: number;
    collaboration: number;
    problemSolving: number;
    adaptability: number;
  };
  fullAnalysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('upload');
  const [transcriptBlocks, setTranscriptBlocks] = useState<TranscriptBlock[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const handleTranscriptionComplete = (blocks: TranscriptBlock[]) => {
    setTranscriptBlocks(blocks);
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
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {currentScreen === 'upload' && (
        <UploadScreen onTranscriptionComplete={handleTranscriptionComplete} />
      )}
      {currentScreen === 'editor' && (
        <TranscriptEditor
          transcriptBlocks={transcriptBlocks}
          setTranscriptBlocks={setTranscriptBlocks}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}
      {currentScreen === 'analysis' && analysisData && (
        <AnalysisDashboard
          analysisData={analysisData}
          onBackToUpload={handleBackToUpload}
        />
      )}
    </div>
  );
}
