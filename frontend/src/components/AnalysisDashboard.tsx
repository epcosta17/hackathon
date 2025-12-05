import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Home, ChevronDown, ChevronUp, Award, TrendingUp, Brain, Clock, Users, Code, MessageSquare, Zap, HelpCircle, ArrowLeft, Save, Check, BarChart3, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AnalysisData } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  SiReact, SiNextdotjs, SiTypescript, SiNodedotjs, SiExpress, SiPostgresql,
  SiJest, SiDocker, SiKubernetes, SiGithubactions, SiFigma, SiPython,
  SiJavascript, SiGo, SiRust, SiMongodb, SiMysql, SiRedis,
  SiGraphql, SiVuedotjs, SiAngular, SiDjango, SiFlask, SiFastapi,
  SiTailwindcss, SiBootstrap, SiAmazon, SiGooglecloud
} from 'react-icons/si';
import { UserMenu } from './UserMenu';
import { db, auth } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getJSON, postJSON, authenticatedFetch } from '../utils/api';

interface Note {
  id: number;
  interview_id: number;
  timestamp: number;
  content: string;
  is_bookmark: boolean;
  created_at: string;
  updated_at: string;
}

interface AnalysisDashboardProps {
  analysisData: AnalysisData;
  transcriptBlocks: any[];
  onBackToUpload: () => void;
  onBackToEditor: () => void;
  currentInterviewId: number | null;
  currentInterviewTitle: string;
  onSaveInterview: (titleOrId: number | string) => void;
  audioFile: File | null;
  notes: Note[];
  waveformData: number[] | null;
  hasNewAnalysis: boolean;
  onAnalysisSaved: () => void;
}

export function AnalysisDashboard({
  analysisData,
  transcriptBlocks,
  onBackToUpload,
  onBackToEditor,
  currentInterviewId,
  currentInterviewTitle,
  onSaveInterview,
  audioFile,
  notes,
  waveformData,
  hasNewAnalysis,
  onAnalysisSaved
}: AnalysisDashboardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState('');

  useEffect(() => {
    if (currentInterviewTitle) {
      setInterviewTitle(currentInterviewTitle);
    }
  }, [currentInterviewTitle]);

  const [expandedSections, setExpandedSections] = useState({
    keyPoints: true,
    coding: true,
    technologies: true,
    qa: true,
    general: true,
  });

  // Generate DOCX report when loading the dashboard
  // This ensures the report is available even after backend restarts
  useEffect(() => {
    const generateReport = async () => {
      if (analysisData && transcriptBlocks.length > 0) {
        // Generate DOCX from existing analysis data (without re-analyzing)
        try {
          const response = await postJSON('/api/generate-report', {
            analysis_data: analysisData,
            transcript_blocks: transcriptBlocks
          });

          if (response.ok) {
            const data = await response.json();
            // Update the docx_path if needed
            if (data.docx_path) {
              analysisData.docx_path = data.docx_path;
            }
            console.log('Report generation triggered for cache');
          }
        } catch (error) {
          console.error('Failed to generate report:', error);
        }
      }
    };
    generateReport();
  }, []); // Run once on mount

  // Load interview title for existing interviews (Firestore)
  useEffect(() => {
    const loadInterviewTitle = async () => {
      if (!currentInterviewId || !auth.currentUser) return;

      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'interviews', String(currentInterviewId));
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          setInterviewTitle(data.title || '');
        }
      } catch (error) {
        console.error('Failed to load interview title:', error);
      }
    };
    loadInterviewTitle();
  }, [currentInterviewId]);

  // Don't auto-show dialog - let user click Save button when ready

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get technology icon based on name
  const getTechIcon = (techName: string) => {
    const name = techName.toLowerCase();
    const iconProps = { className: "w-6 h-6", style: { color: '#a855f7' } };

    if (name.includes('react')) return <SiReact {...iconProps} />;
    if (name.includes('next')) return <SiNextdotjs {...iconProps} />;
    if (name.includes('typescript')) return <SiTypescript {...iconProps} />;
    if (name.includes('node')) return <SiNodedotjs {...iconProps} />;
    if (name.includes('express')) return <SiExpress {...iconProps} />;
    if (name.includes('postgres')) return <SiPostgresql {...iconProps} />;
    if (name.includes('jest')) return <SiJest {...iconProps} />;
    if (name.includes('docker')) return <SiDocker {...iconProps} />;
    if (name.includes('kubernetes') || name.includes('k8s')) return <SiKubernetes {...iconProps} />;
    if (name.includes('github')) return <SiGithubactions {...iconProps} />;
    if (name.includes('figma')) return <SiFigma {...iconProps} />;
    if (name.includes('python')) return <SiPython {...iconProps} />;
    if (name.includes('javascript') || name.includes('js')) return <SiJavascript {...iconProps} />;
    if (name.includes('golang') || name.includes('go')) return <SiGo {...iconProps} />;
    if (name.includes('rust')) return <SiRust {...iconProps} />;
    if (name.includes('mongodb') || name.includes('mongo')) return <SiMongodb {...iconProps} />;
    if (name.includes('mysql')) return <SiMysql {...iconProps} />;
    if (name.includes('redis')) return <SiRedis {...iconProps} />;
    if (name.includes('graphql')) return <SiGraphql {...iconProps} />;
    if (name.includes('vue')) return <SiVuedotjs {...iconProps} />;
    if (name.includes('angular')) return <SiAngular {...iconProps} />;
    if (name.includes('django')) return <SiDjango {...iconProps} />;
    if (name.includes('flask')) return <SiFlask {...iconProps} />;
    if (name.includes('fastapi')) return <SiFastapi {...iconProps} />;
    if (name.includes('tailwind')) return <SiTailwindcss {...iconProps} />;
    if (name.includes('bootstrap')) return <SiBootstrap {...iconProps} />;
    if (name.includes('aws') || name.includes('amazon')) return <SiAmazon {...iconProps} />;
    if (name.includes('gcp') || name.includes('google cloud')) return <SiGooglecloud {...iconProps} />;

    // Default icon for unknown technologies
    return <Code {...iconProps} />;
  };

  // No parsing needed - we get JSON directly from the API!

  const handleSaveInterview = async () => {
    if (!interviewTitle.trim()) {
      toast.error('Please enter a title for this interview');
      return;
    }

    setIsSaving(true);
    try {
      if (currentInterviewId) {
        // UPDATE existing interview in Firestore (Direct)
        console.log('📝 Updating interview title:', currentInterviewId);

        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        const interviewRef = doc(db, 'users', uid, 'interviews', String(currentInterviewId));

        await setDoc(interviewRef, {
          title: interviewTitle,
          updated_at: new Date().toISOString()
        }, { merge: true });

        console.log('✅ Update successful (Firestore)');
        toast.success('Interview updated successfully!');

        // Also update Analysis subcollection if needed? 
        // Usually analysis is saved when "AI Analysis" finishes. 
        // But if we want to be safe:
        if (analysisData) {
          const analysisRef = doc(db, 'users', uid, 'interviews', String(currentInterviewId), 'data', 'analysis');
          await setDoc(analysisRef, analysisData, { merge: true });
        }

        onAnalysisSaved();
        setShowSaveDialog(false);
      } else {
        // CREATE new interview -> Delegate to Parent (App.tsx)
        // We pass the title so App.tsx can use it.
        console.log('🆕 Delegating creation to App.tsx with title:', interviewTitle);
        // We cast to any because the prop signature might need adjustment in parent
        onSaveInterview(interviewTitle);
        onAnalysisSaved();
        setShowSaveDialog(false);
      }
    } catch (error) {
      console.error('Error saving interview:', error);
      toast.error('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!analysisData.docx_path) {
      toast.error('DOCX file not ready yet. Please wait a moment and try again.');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await authenticatedFetch('/api/download-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docx_path: analysisData.docx_path
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview_analysis_${Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report downloaded successfully!');
      } else if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.detail || 'Report not found. Please run analysis again to generate a new report.');
      } else {
        console.error('Download failed:', response.statusText);
        toast.error('Failed to download report. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('An error occurred while downloading the report.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getComplexityColor = (complexity: string) => {
    if (complexity.includes('Expert')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (complexity.includes('Advanced')) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (complexity.includes('Intermediate')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  const getComplexityTextColor = (complexity: string) => {
    if (complexity.includes('Expert')) return 'text-purple-400';
    if (complexity.includes('Advanced')) return 'text-red-400';
    if (complexity.includes('Intermediate')) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getPaceColor = (pace: string) => {
    if (pace.includes('Intensive')) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (pace.includes('Fast')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    if (pace.includes('Moderate')) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  const getPaceTextColor = (pace: string) => {
    if (pace.includes('Intensive')) return 'text-red-400';
    if (pace.includes('Fast')) return 'text-orange-400';
    if (pace.includes('Moderate')) return 'text-indigo-400';
    return 'text-green-400';
  };

  // Score tooltips
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const communicationRef = React.useRef<HTMLDivElement>(null);
  const technicalRef = React.useRef<HTMLDivElement>(null);
  const engagementRef = React.useRef<HTMLDivElement>(null);

  const handleTooltipEnter = (type: string, ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
      setHoveredTooltip(type);
    }
  };

  const scoreExplanations = {
    communication: analysisData.statistics.communicationScoreExplanation || "Measures clarity of explanations, response quality, and overall dialogue flow throughout the interview.",
    technical: analysisData.statistics.technicalDepthScoreExplanation || "Evaluates the complexity of challenges, depth of technical discussion, and coverage of advanced concepts.",
    engagement: analysisData.statistics.engagementScoreExplanation || "Assesses the candidate's active participation, quality of questions asked, and overall interaction level."
  };

  return (
    <div className="h-screen max-h-screen flex flex-col bg-zinc-950 overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="w-full px-8 py-4">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-white text-2xl font-bold">Interview Analysis Report</h1>
                <p className="text-zinc-400 text-sm">AI-generated insights and evaluation metrics</p>
              </div>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Button
                onClick={onBackToUpload}
                className="bg-gradient-to-r from-slate-600 to-zinc-600 hover:from-slate-700 hover:to-zinc-700 text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <Button
                onClick={onBackToEditor}
                className="bg-gradient-to-r from-slate-600 to-zinc-600 hover:from-slate-700 hover:to-zinc-700 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Transcript
              </Button>
              {hasNewAnalysis && (
                <Button
                  onClick={() => {
                    console.log('🟢 Save Interview button clicked');
                    setShowSaveDialog(true);
                  }}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Interview'}
                </Button>
              )}
              <Button
                onClick={onBackToUpload}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                New Interview
              </Button>
              <Button
                onClick={handleDownloadReport}
                disabled={isDownloading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Generating...' : 'Download Report'}
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hidden">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Expert Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.1,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
            className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 mb-8"
          >
            <motion.div
              className="flex items-center gap-3 mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Brain className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Expert Statistics</h2>
            </motion.div>

            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Communication Score */}
              <motion.div
                className="p-2 relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-zinc-400 text-sm">Communication Score</p>
                      <div
                        ref={communicationRef}
                        className="relative cursor-help"
                        onMouseEnter={() => handleTooltipEnter('communication', communicationRef)}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      >
                        <HelpCircle className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{analysisData.statistics.communicationScore}</p>
                    <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analysisData.statistics.communicationScore}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Technical Depth */}
              <motion.div
                className="p-2 relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-lg">
                    <Code className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-zinc-400 text-sm">Technical Depth</p>
                      <div
                        ref={technicalRef}
                        className="relative cursor-help"
                        onMouseEnter={() => handleTooltipEnter('technical', technicalRef)}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      >
                        <HelpCircle className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{analysisData.statistics.technicalDepthScore}</p>
                    <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analysisData.statistics.technicalDepthScore}%` }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Engagement Score */}
              <motion.div
                className="p-2 relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <MessageSquare className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-zinc-400 text-sm">Engagement Score</p>
                      <div
                        ref={engagementRef}
                        className="relative cursor-help"
                        onMouseEnter={() => handleTooltipEnter('engagement', engagementRef)}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      >
                        <HelpCircle className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{analysisData.statistics.engagementScore}</p>
                    <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analysisData.statistics.engagementScore}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full"
                        style={{
                          background: 'linear-gradient(to bottom right, #f59e0b, #eab308)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            <motion.div
              className="flex flex-wrap justify-between items-center gap-x-8 gap-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <p className="text-zinc-500 text-xs">Duration</p>
                </div>
                <p className="text-xl font-bold text-white">{analysisData.statistics.duration}</p>
              </div>
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="flex items-center gap-1 mb-1">
                  <Code className="w-4 h-4 text-zinc-500" />
                  <p className="text-zinc-500 text-xs">Technical</p>
                </div>
                <p className="text-lg font-bold text-indigo-400">{analysisData.statistics.technicalTime}</p>
              </div>
              <div className="flex flex-col items-center min-w-[90px]">
                <div className="flex items-center gap-1 mb-1">
                  <MessageSquare className="w-4 h-4 text-zinc-500" />
                  <p className="text-zinc-500 text-xs">Q&A Time</p>
                </div>
                <p className="text-lg font-bold text-yellow-400">{analysisData.statistics.qaTime}</p>
              </div>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="flex items-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <p className="text-zinc-500 text-xs">Engagement</p>
                </div>
                <p className="text-xl font-bold text-green-400">{analysisData.statistics.engagement}</p>
              </div>
              <div className="flex flex-col items-center min-w-[140px]">
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-4 h-4 text-zinc-500" />
                  <p className="text-zinc-500 text-xs">Complexity</p>
                </div>
                <p className={`text-xl font-bold ${getComplexityTextColor(analysisData.statistics.complexity)}`}>{analysisData.statistics.complexity}</p>
              </div>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-zinc-500" />
                  <p className="text-zinc-500 text-xs">Pace</p>
                </div>
                <p className={`text-xl font-bold ${getPaceTextColor(analysisData.statistics.pace)}`}>{analysisData.statistics.pace}</p>
              </div>
              <div className="flex flex-col items-center min-w-[70px]">
                <div className="flex items-center gap-1 mb-1">
                  <Award className="w-4 h-4 text-zinc-500" />
                  <p className="text-zinc-500 text-xs">Questions</p>
                </div>
                <p className="text-xl font-bold text-purple-400">{analysisData.statistics.technicalQuestions}</p>
              </div>
              <div className="flex flex-col items-center min-w-[70px]">
                <div className="flex items-center gap-1 mb-1">
                  <Brain className="w-4 h-4 text-zinc-500" />
                  <p className="text-zinc-500 text-xs">Follow-ups</p>
                </div>
                <p className="text-xl font-bold text-yellow-400">{analysisData.statistics.followUpQuestions}</p>
              </div>
            </motion.div>
          </motion.div>

          {/* General Comments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="bg-zinc-900/30 border border-zinc-800 rounded-lg mb-8"
          >
            <button
              onClick={() => toggleSection('general')}
              className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/30 transition-colors"
            >
              <h2 className="text-xl font-bold text-white">💬 General Comments</h2>
              {expandedSections.general ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedSections.general && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-6 text-zinc-300">
                    <div>
                      <p className="text-purple-400 font-medium mb-3">Interview Overview</p>
                      <p className="leading-loose">{analysisData.generalComments.howInterview}</p>
                    </div>
                    <div>
                      <p className="text-purple-400 font-medium mb-3">Interviewer's Attitude</p>
                      <p className="leading-loose">{analysisData.generalComments.attitude}</p>
                    </div>
                    <div>
                      <p className="text-purple-400 font-medium mb-3">Platform Used</p>
                      <p className="leading-loose">{analysisData.generalComments.platform}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Key Technical Points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="bg-zinc-900/30 border border-zinc-800 rounded-lg mb-8"
          >
            <button
              onClick={() => toggleSection('keyPoints')}
              className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/30 transition-colors"
            >
              <h2 className="text-xl font-bold text-white">💡 Key Technical Emphasis Points</h2>
              {expandedSections.keyPoints ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedSections.keyPoints && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-6 text-zinc-300">
                    {analysisData.keyPoints.map((point, idx) => (
                      <div key={idx}>
                        <p className="text-yellow-400 font-semibold mb-3">{point.title}</p>
                        <p className="leading-loose">{point.content}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Coding Challenge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="bg-zinc-900/30 border border-zinc-800 rounded-lg mb-8"
          >
            <button
              onClick={() => toggleSection('coding')}
              className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/30 transition-colors"
            >
              <h2 className="text-xl font-bold text-white">💻 Live Coding Challenge Details</h2>
              {expandedSections.coding ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedSections.coding && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-6 text-zinc-300">
                    <div>
                      <p className="font-semibold mb-3" style={{ color: '#818cf8' }}>Core Exercise</p>
                      <p className="leading-loose">{analysisData.codingChallenge.coreExercise}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-3" style={{ color: '#fb923c' }}>Critical Follow-up</p>
                      <p className="leading-loose">{analysisData.codingChallenge.followUp}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-3" style={{ color: '#c084fc' }}>Required Knowledge</p>
                      <p className="leading-loose">{analysisData.codingChallenge.knowledge}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Technologies */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="bg-zinc-900/30 border border-zinc-800 rounded-lg mb-8"
          >
            <button
              onClick={() => toggleSection('technologies')}
              className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/30 transition-colors"
            >
              <h2 className="text-xl font-bold text-white">🛠️ Technologies and Tools Used</h2>
              {expandedSections.technologies ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedSections.technologies && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {analysisData.technologies.map((tech, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-1">
                            {getTechIcon(tech.name)}
                            <span className="text-sm font-semibold truncate" style={{ color: '#a855f7' }}>{tech.name}</span>
                          </div>
                          {tech.timestamps && (
                            <div className="text-xs text-zinc-500 ml-9">
                              {tech.timestamps}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Q&A Topics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="bg-zinc-900/30 border border-zinc-800 rounded-lg"
          >
            <button
              onClick={() => toggleSection('qa')}
              className="w-full flex items-center justify-between p-6 hover:bg-zinc-800/30 transition-colors"
            >
              <h2 className="text-xl font-bold text-white">🗣️ Non-Technical & Situational Q&A Topics</h2>
              {expandedSections.qa ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
            </button>
            <AnimatePresence>
              {expandedSections.qa && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-6 text-zinc-300">
                    {analysisData.qaTopics.map((topic, idx) => (
                      <div key={idx}>
                        <p className="text-green-400 font-semibold mb-3">{topic.title}</p>
                        <p className="leading-loose">{topic.content}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Portal Tooltip */}
      {hoveredTooltip && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            width: '360px',
            zIndex: 99999,
            backgroundColor: '#09090b',
            color: '#d4d4d8',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #3f3f46',
            fontSize: '12px',
            lineHeight: '1.5',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none'
          }}
        >
          {scoreExplanations[hoveredTooltip as keyof typeof scoreExplanations]}
        </div>,
        document.body
      )}

      {/* Save Interview Dialog */}
      {showSaveDialog && typeof document !== 'undefined' && createPortal(
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
          onClick={() => setShowSaveDialog(false)}
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
              maxWidth: '480px',
              margin: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px'
            }}>
              {currentInterviewId ? 'Update Interview' : 'Save Interview'}
            </h3>
            <p style={{
              color: '#a1a1aa',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              Give this interview analysis a memorable title
            </p>
            <input
              type="text"
              value={interviewTitle}
              onChange={(e) => setInterviewTitle(e.target.value)}
              placeholder="e.g., Senior React Developer - John Smith"
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#27272a',
                border: '1px solid #52525b',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                boxShadow: 'none',
                marginBottom: '24px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = 'none';
              }}
              onBlur={(e) => e.target.style.borderColor = '#52525b'}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && interviewTitle.trim()) {
                  handleSaveInterview();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setShowSaveDialog(false)}
                variant="outline"
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInterview}
                disabled={isSaving || !interviewTitle.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? (currentInterviewId ? 'Updating...' : 'Saving...') : (currentInterviewId ? 'Update' : 'Save')}
              </Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
