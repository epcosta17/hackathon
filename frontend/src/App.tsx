import React, { useState } from 'react';
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

export interface AnalysisData {
  markdown_report: string;
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

  return (
    <div className="bg-zinc-950">
      {currentScreen === 'upload' && (
        <UploadScreen onTranscriptionComplete={handleTranscriptionComplete} />
      )}
      {currentScreen === 'editor' && (
        <TranscriptEditor
          transcriptBlocks={transcriptBlocks}
          setTranscriptBlocks={setTranscriptBlocks}
          onAnalysisComplete={handleAnalysisComplete}
          audioFile={audioFile}
        />
      )}
      {currentScreen === 'analysis' && analysisData && (
        <AnalysisDashboard
          analysisData={analysisData}
          transcriptBlocks={transcriptBlocks}
          onBackToUpload={handleBackToUpload}
        />
      )}
    </div>
  );
}
