import React, { useState, useMemo } from 'react';
import { Download, Home, ChevronDown, ChevronUp, Award, TrendingUp, Brain, Clock, Users, Code, MessageSquare, Zap, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { AnalysisData, TranscriptBlock } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SiReact, SiNextdotjs, SiTypescript, SiNodedotjs, SiExpress, SiPostgresql, 
  SiJest, SiDocker, SiKubernetes, SiGithubactions, SiFigma, SiPython, 
  SiJavascript, SiGo, SiRust, SiMongodb, SiMysql, SiRedis, 
  SiGraphql, SiVuedotjs, SiAngular, SiDjango, SiFlask, SiFastapi,
  SiTailwindcss, SiBootstrap, SiAmazon, SiGooglecloud
} from 'react-icons/si';

interface AnalysisDashboardProps {
  analysisData: AnalysisData;
  transcriptBlocks: TranscriptBlock[];
  onBackToUpload: () => void;
}

interface ParsedAnalysis {
  generalComments: {
    howInterview: string;
    attitude: string;
    structure: string;
    platform: string;
  };
  keyPoints: Array<{ title: string; content: string }>;
  codingChallenge: {
    coreExercise: string;
    followUp: string;
    knowledge: string;
  };
  technologies: Array<{ name: string; timestamps?: string }>;
  qaTopics: Array<{ title: string; content: string }>;
  statistics: {
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
  };
}

export function AnalysisDashboard({ analysisData, transcriptBlocks, onBackToUpload }: AnalysisDashboardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    keyPoints: true,
    coding: true,
    technologies: true,
    qa: true,
    general: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Strip markdown formatting from text
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold **text**
      .replace(/\*(.+?)\*/g, '$1')      // Remove italic *text*
      .replace(/`(.+?)`/g, '$1')        // Remove code `text`
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links [text](url)
      .trim();
  };

  // Get technology icon based on name
  const getTechIcon = (techName: string) => {
    const name = techName.toLowerCase();
    const iconProps = { className: "w-6 h-6", style: { color: '#06b6d4' } };
    
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

  // Parse markdown report into structured data
  const parsedData = useMemo((): ParsedAnalysis => {
    const lines = analysisData.markdown_report.split('\n');
    const data: ParsedAnalysis = {
      generalComments: { howInterview: '', attitude: '', structure: '', platform: '' },
      keyPoints: [],
      codingChallenge: { coreExercise: '', followUp: '', knowledge: '' },
      technologies: [],
      qaTopics: [],
      statistics: {
        duration: '55:00',
        technicalTime: '35:00 (64%)',
        qaTime: '15:00 (27%)',
        technicalQuestions: 3,
        followUpQuestions: 8,
        technologiesCount: 10,
        complexity: 'Intermediate to Advanced',
        pace: 'Moderate',
        engagement: 8,
        communicationScore: 85,
        technicalDepthScore: 78,
        engagementScore: 80,
      },
    };

    let currentSection = '';
    let currentSubItem = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('## General Comments')) currentSection = 'general';
      else if (line.includes('## Key Technical Emphasis Points')) currentSection = 'keyPoints';
      else if (line.includes('## Live Coding Challenge')) currentSection = 'coding';
      else if (line.includes('## Technologies and Tools')) currentSection = 'technologies';
      else if (line.includes('## Non-Technical & Situational Q&A')) currentSection = 'qa';
      else if (line.includes('## Expert Statistics')) currentSection = 'statistics';

      if (currentSection === 'general') {
        if (line.includes('**A general explanation')) {
          const content = stripMarkdown(line.split(':').slice(1).join(':').trim());
          data.generalComments.howInterview = content;
        } else if (line.includes('**What\'s the interviewer\'s attitude?**')) {
          const content = stripMarkdown(line.split('?**').slice(1).join('').trim());
          data.generalComments.attitude = content;
        } else if (line.includes('**Structure of the interview')) {
          data.generalComments.structure = stripMarkdown(line.split(':').slice(1).join(':').trim());
          // Collect sub-bullets
          let j = i + 1;
          while (j < lines.length && lines[j].trim().startsWith('*')) {
            data.generalComments.structure += ' ' + stripMarkdown(lines[j].trim());
            j++;
          }
        } else if (line.includes('**Is it done on')) {
          const content = stripMarkdown(line.split('?**').slice(1).join('').trim());
          data.generalComments.platform = content;
        }
      } else if (currentSection === 'keyPoints' && line.startsWith('* **')) {
        const match = line.match(/\* \*\*(.+?):\*\* (.+)/);
        if (match) {
          data.keyPoints.push({ title: stripMarkdown(match[1]), content: stripMarkdown(match[2]) });
        }
      } else if (currentSection === 'coding') {
        if (line.includes('**The Core Exercise:**')) {
          data.codingChallenge.coreExercise = stripMarkdown(line.split(':**').slice(1).join('').trim());
        } else if (line.includes('**Critical Technical Follow-up:**')) {
          data.codingChallenge.followUp = stripMarkdown(line.split(':**').slice(1).join('').trim());
        } else if (line.includes('**Required Technical Knowledge:**')) {
          let j = i + 1;
          const knowledgeItems: string[] = [];
          const knowledgeText = line.split(':**').slice(1).join('').trim();
          
          // If knowledge is on the same line
          if (knowledgeText) {
            knowledgeItems.push(stripMarkdown(knowledgeText));
          }
          
          // Collect sub-bullets
          while (j < lines.length && lines[j].trim().startsWith('*') && !lines[j].includes('##')) {
            const item = stripMarkdown(lines[j].trim().replace(/^\*+\s*/, ''));
            knowledgeItems.push(item);
            
            // Extract technologies from the knowledge text
            const techMatch = item.match(/(TypeScript|JavaScript|React|Vue|Angular|Python|Java|Go|Rust|Node\.js|Django|Flask|FastAPI|Express|JSX|SQL|NoSQL|PostgreSQL|MongoDB|Redis|MySQL|GraphQL|Docker|Kubernetes|AWS|GCP|Azure|Git|CI\/CD|Jest|Pytest)/gi);
            if (techMatch) {
              techMatch.forEach(tech => {
                if (!data.technologies.some(t => t.name.toLowerCase() === tech.toLowerCase())) {
                  data.technologies.push({ name: tech, timestamps: undefined });
                }
              });
            }
            j++;
          }
          data.codingChallenge.knowledge = knowledgeItems.join(', ');
        }
      } else if (currentSection === 'technologies') {
        // Handle both "* tech" and "    * tech" (indented sub-bullets)
        // Format: "* TechnologyName (MM:SS-MM:SS)" or just "* TechnologyName"
        if (line.trim().startsWith('*') && !line.includes('**') && !line.includes('List of Technologies')) {
          const techLine = stripMarkdown(line.replace(/^\s*\*\s*/, '').trim());
          if (techLine && !techLine.toLowerCase().includes('list of technologies')) {
            // Try to extract technology name and timestamps
            const match = techLine.match(/^(.+?)\s*\(([^)]+)\)$/);
            if (match) {
              data.technologies.push({ name: match[1].trim(), timestamps: match[2].trim() });
            } else {
              data.technologies.push({ name: techLine, timestamps: undefined });
            }
          }
        }
      } else if (currentSection === 'qa' && line.startsWith('* **')) {
        const match = line.match(/\* \*\*(.+?):\*\* (.+)/);
        if (match) {
          data.qaTopics.push({ title: stripMarkdown(match[1]), content: stripMarkdown(match[2]) });
        }
      } else if (currentSection === 'statistics') {
        if (line.includes('**Total Interview Duration:**')) {
          data.statistics.duration = line.split(':**').pop()?.trim() || data.statistics.duration;
        } else if (line.includes('**Technical Discussion Time:**')) {
          data.statistics.technicalTime = line.split(':**').pop()?.trim() || data.statistics.technicalTime;
        } else if (line.includes('**Q&A Discussion Time:**')) {
          data.statistics.qaTime = line.split(':**').pop()?.trim() || data.statistics.qaTime;
        } else if (line.includes('**Number of Technical Questions:**')) {
          data.statistics.technicalQuestions = parseInt(line.split(':**').pop()?.trim() || '0') || data.statistics.technicalQuestions;
        } else if (line.includes('**Number of Follow-up Questions:**')) {
          data.statistics.followUpQuestions = parseInt(line.split(':**').pop()?.trim() || '0') || data.statistics.followUpQuestions;
        } else if (line.includes('**Technologies Mentioned:**')) {
          data.statistics.technologiesCount = parseInt(line.split(':**').pop()?.trim() || '0') || data.statistics.technologiesCount;
        } else if (line.includes('**Complexity Level:**')) {
          data.statistics.complexity = line.split(':**').pop()?.trim() || data.statistics.complexity;
        } else if (line.includes('**Interview Pace:**')) {
          data.statistics.pace = line.split(':**').pop()?.trim() || data.statistics.pace;
        } else if (line.includes('**Candidate Engagement Opportunities:**')) {
          data.statistics.engagement = parseInt(line.split(':**').pop()?.trim() || '0') || data.statistics.engagement;
        } else if (line.includes('**Communication Score:**')) {
          data.statistics.communicationScore = parseInt(line.split(':**').pop()?.trim() || '0') || data.statistics.communicationScore;
        } else if (line.includes('**Technical Depth Score:**')) {
          data.statistics.technicalDepthScore = parseInt(line.split(':**').pop()?.trim() || '0') || data.statistics.technicalDepthScore;
        } else if (line.includes('**Engagement Score:**')) {
          data.statistics.engagementScore = parseInt(line.split(':**').pop()?.trim() || '0') || data.statistics.engagementScore;
        }
      }
    }

    // Deduplicate technologies (case-insensitive)
    const uniqueTechs = new Map<string, { name: string; timestamps?: string }>();
    data.technologies.forEach(tech => {
      const lowerTech = tech.name.toLowerCase();
      if (!uniqueTechs.has(lowerTech)) {
        uniqueTechs.set(lowerTech, tech);
      } else {
        // If we already have this tech but new one has timestamps, update it
        const existing = uniqueTechs.get(lowerTech)!;
        if (!existing.timestamps && tech.timestamps) {
          uniqueTechs.set(lowerTech, tech);
        }
      }
    });
    data.technologies = Array.from(uniqueTechs.values());

    return data;
  }, [analysisData.markdown_report]);

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/download-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript_blocks: transcriptBlocks
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
      } else {
        console.error('Download failed:', response.statusText);
        alert('Failed to download report. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('An error occurred while downloading the report.');
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

  const getPaceColor = (pace: string) => {
    if (pace.includes('Intensive')) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (pace.includes('Fast')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    if (pace.includes('Moderate')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  // Score tooltips
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  const scoreExplanations = {
    communication: "Measures clarity of explanations, response quality, and overall dialogue flow throughout the interview.",
    technical: "Evaluates the complexity of challenges, depth of technical discussion, and coverage of advanced concepts.",
    engagement: "Assesses the candidate's active participation, quality of questions asked, and overall interaction level."
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-2xl font-bold">Interview Analysis Dashboard</h1>
              <p className="text-zinc-400 text-sm">Comprehensive insights and recommendations</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleDownloadReport}
                disabled={isDownloading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Generating...' : 'Download DOCX'}
              </Button>
              <Button
                onClick={onBackToUpload}
                variant="outline"
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Expert Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Expert Statistics</h2>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Communication Score */}
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-800/30 rounded-lg p-6 relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-zinc-400 text-sm">Communication Score</p>
                    <div 
                      className="relative"
                      onMouseEnter={() => setHoveredTooltip('communication')}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      <HelpCircle className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-help" />
                      {hoveredTooltip === 'communication' && (
                        <div className="absolute left-0 top-6 w-64 bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl z-50 text-xs text-zinc-300 leading-relaxed">
                          {scoreExplanations.communication}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{parsedData.statistics.communicationScore}</p>
                  <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${parsedData.statistics.communicationScore}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Depth */}
            <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-800/30 rounded-lg p-6 relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Code className="w-8 h-8 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-zinc-400 text-sm">Technical Depth</p>
                    <div 
                      className="relative"
                      onMouseEnter={() => setHoveredTooltip('technical')}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      <HelpCircle className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-help" />
                      {hoveredTooltip === 'technical' && (
                        <div className="absolute left-0 top-6 w-64 bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl z-50 text-xs text-zinc-300 leading-relaxed">
                          {scoreExplanations.technical}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{parsedData.statistics.technicalDepthScore}</p>
                  <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${parsedData.statistics.technicalDepthScore}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Score */}
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800/30 rounded-lg p-6 relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <MessageSquare className="w-8 h-8 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-zinc-400 text-sm">Engagement Score</p>
                    <div 
                      className="relative"
                      onMouseEnter={() => setHoveredTooltip('engagement')}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      <HelpCircle className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-help" />
                      {hoveredTooltip === 'engagement' && (
                        <div className="absolute left-0 top-6 w-64 bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl z-50 text-xs text-zinc-300 leading-relaxed">
                          {scoreExplanations.engagement}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{parsedData.statistics.engagementScore}</p>
                  <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${parsedData.statistics.engagementScore}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-between items-center gap-x-8 gap-y-4">
            <div className="flex flex-col items-center min-w-[80px]">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-zinc-500" />
                <p className="text-zinc-500 text-xs">Duration</p>
              </div>
              <p className="text-xl font-bold text-white">{parsedData.statistics.duration}</p>
            </div>
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="flex items-center gap-1 mb-1">
                <Code className="w-4 h-4 text-zinc-500" />
                <p className="text-zinc-500 text-xs">Technical</p>
              </div>
              <p className="text-lg font-bold text-blue-400">{parsedData.statistics.technicalTime}</p>
            </div>
            <div className="flex flex-col items-center min-w-[90px]">
              <div className="flex items-center gap-1 mb-1">
                <MessageSquare className="w-4 h-4 text-purple-300" />
                <p className="text-zinc-300 text-xs">Q&A Time</p>
              </div>
              <p className="text-lg font-bold text-purple-300">{parsedData.statistics.qaTime}</p>
            </div>
            <div className="flex flex-col items-center min-w-[80px]">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-4 h-4 text-green-400" />
                <p className="text-zinc-300 text-xs">Engagement</p>
              </div>
              <p className="text-xl font-bold text-green-400">{parsedData.statistics.engagement}</p>
            </div>
            <div className="flex flex-col items-center min-w-[140px]">
              <div className="flex items-center gap-1 mb-1">
                <Zap className="w-4 h-4 text-zinc-500" />
                <p className="text-zinc-500 text-xs">Complexity</p>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getComplexityColor(parsedData.statistics.complexity)}`}>
                {parsedData.statistics.complexity}
              </span>
            </div>
            <div className="flex flex-col items-center min-w-[80px]">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-zinc-500" />
                <p className="text-zinc-500 text-xs">Pace</p>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPaceColor(parsedData.statistics.pace)}`}>
                {parsedData.statistics.pace}
              </span>
            </div>
            <div className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center gap-1 mb-1">
                <Award className="w-4 h-4 text-zinc-500" />
                <p className="text-zinc-500 text-xs">Questions</p>
              </div>
              <p className="text-xl font-bold text-cyan-400">{parsedData.statistics.technicalQuestions}</p>
            </div>
            <div className="flex flex-col items-center min-w-[70px]">
              <div className="flex items-center gap-1 mb-1">
                <Brain className="w-4 h-4 text-zinc-500" />
                <p className="text-zinc-500 text-xs">Follow-ups</p>
              </div>
              <p className="text-xl font-bold text-yellow-400">{parsedData.statistics.followUpQuestions}</p>
            </div>
          </div>
        </motion.div>

        {/* General Comments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
                    <p className="text-cyan-400 font-medium mb-3">Interview Overview</p>
                    <p className="leading-loose">{parsedData.generalComments.howInterview}</p>
                  </div>
                  <div>
                    <p className="text-cyan-400 font-medium mb-3">Interviewer's Attitude</p>
                    <p className="leading-loose">{parsedData.generalComments.attitude}</p>
                  </div>
                  <div>
                    <p className="text-cyan-400 font-medium mb-3">Platform Used</p>
                    <p className="leading-loose">{parsedData.generalComments.platform}</p>
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
          transition={{ delay: 0.6 }}
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
                  {parsedData.keyPoints.map((point, idx) => (
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
          transition={{ delay: 0.7 }}
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
                    <p className="font-semibold mb-3" style={{ color: '#60a5fa' }}>Core Exercise</p>
                    <p className="leading-loose">{parsedData.codingChallenge.coreExercise}</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-3" style={{ color: '#fb923c' }}>Critical Follow-up</p>
                    <p className="leading-loose">{parsedData.codingChallenge.followUp}</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-3" style={{ color: '#c084fc' }}>Required Knowledge</p>
                    <p className="leading-loose">{parsedData.codingChallenge.knowledge}</p>
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
          transition={{ delay: 0.8 }}
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
                    {parsedData.technologies.map((tech, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          {getTechIcon(tech.name)}
                          <span className="text-sm font-semibold truncate" style={{ color: '#06b6d4' }}>{tech.name}</span>
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
          transition={{ delay: 0.9 }}
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
                  {parsedData.qaTopics.map((topic, idx) => (
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
      </main>
    </div>
  );
}
