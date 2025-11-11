import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Edit2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { TranscriptBlock, AnalysisData } from '../App';
import { motion } from 'motion/react';

interface TranscriptEditorProps {
  transcriptBlocks: TranscriptBlock[];
  setTranscriptBlocks: (blocks: TranscriptBlock[]) => void;
  onAnalysisComplete: (data: AnalysisData) => void;
}

export function TranscriptEditor({
  transcriptBlocks,
  setTranscriptBlocks,
  onAnalysisComplete,
}: TranscriptEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(100); // Mock duration
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate audio playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, duration]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const jumpToTimestamp = (timestamp: number) => {
    setCurrentTime(timestamp);
    setIsPlaying(true);
  };

  const handleBlockEdit = (id: string, newText: string) => {
    setTranscriptBlocks(
      transcriptBlocks.map((block) =>
        block.id === id ? { ...block, text: newText } : block
      )
    );
  };

  const getCurrentBlock = () => {
    return transcriptBlocks.find(
      (block) => currentTime >= block.timestamp && currentTime < block.timestamp + block.duration
    );
  };

  const currentBlock = getCurrentBlock();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const mockAnalysis: AnalysisData = {
        bestFitRole: 'Senior Full-Stack Developer',
        communicationScore: 87,
        technicalDebtRisk: 'Low',
        softSkillSummary: {
          leadership: 85,
          collaboration: 90,
          problemSolving: 82,
          adaptability: 88,
        },
        fullAnalysis: {
          strengths: [
            'Strong technical background in React and Node.js with 5 years of experience',
            'Proven leadership skills managing a team of 4 developers',
            'Proactive approach to addressing technical debt',
            'Excellent communication skills and documentation practices',
            'Demonstrates continuous learning mindset',
          ],
          weaknesses: [
            'Limited production experience with AI/ML integration',
            'May need mentorship in scaling applications beyond current team size',
          ],
          recommendations: [
            'Strong candidate for senior individual contributor or tech lead role',
            'Provide opportunities for AI/ML learning and application',
            'Excellent cultural fit based on communication and collaboration indicators',
          ],
        },
      };
      
      onAnalysisComplete(mockAnalysis);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white">Transcript Editor</h1>
              <p className="text-zinc-400 text-sm">Review and refine the interview transcript</p>
            </div>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
            </Button>
          </div>
        </div>
      </header>

      {/* Audio Player */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center gap-6">
            <Button
              onClick={togglePlayPause}
              variant="outline"
              className="w-12 h-12 rounded-full bg-zinc-800 border-zinc-700 hover:bg-zinc-700 p-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </Button>
            
            <div className="flex-1 flex items-center gap-4">
              <span className="text-zinc-400 text-sm min-w-[3rem]">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={currentTime}
                onChange={handleScrub}
                className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <span className="text-zinc-400 text-sm min-w-[3rem]">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-[1800px] mx-auto h-full">
          <div className="grid grid-cols-5 h-full">
            {/* Left Side - Transcript (60%) */}
            <div className="col-span-3 border-r border-zinc-800 overflow-y-auto p-8">
              <div className="max-w-3xl space-y-4">
                {transcriptBlocks.map((block) => {
                  const isActive = currentBlock?.id === block.id;
                  const isEditing = editingBlockId === block.id;

                  return (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`
                        group relative p-4 rounded-lg border transition-all duration-200
                        ${isActive ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 bg-zinc-900/30'}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => jumpToTimestamp(block.timestamp)}
                          className="text-xs text-zinc-500 hover:text-blue-400 transition-colors min-w-[3rem] pt-1"
                        >
                          {formatTime(block.timestamp)}
                        </button>
                        
                        <div className="flex-1">
                          {isEditing ? (
                            <Textarea
                              value={block.text}
                              onChange={(e) => handleBlockEdit(block.id, e.target.value)}
                              onBlur={() => setEditingBlockId(null)}
                              autoFocus
                              className="min-h-[80px] bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                            />
                          ) : (
                            <p
                              onClick={() => jumpToTimestamp(block.timestamp)}
                              className="text-zinc-100 cursor-pointer leading-relaxed"
                            >
                              {block.text}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => setEditingBlockId(block.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-zinc-800 rounded"
                        >
                          <Edit2 className="w-4 h-4 text-zinc-400" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right Side - Info Panel (40%) */}
            <div className="col-span-2 bg-zinc-900/20 p-8 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="text-white mb-2">Transcript Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 text-sm">Total Blocks</span>
                      <span className="text-white">{transcriptBlocks.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 text-sm">Duration</span>
                      <span className="text-white">{formatTime(duration)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 text-sm">Word Count</span>
                      <span className="text-white">
                        {transcriptBlocks.reduce((acc, block) => acc + block.text.split(' ').length, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-blue-400 mb-2">How to Use</h4>
                  <ul className="text-zinc-300 text-sm space-y-2">
                    <li>• Click any timestamp to jump to that point</li>
                    <li>• Click the edit icon to modify text</li>
                    <li>• Active block highlights as audio plays</li>
                    <li>• Click "Run AI Analysis" when ready</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
