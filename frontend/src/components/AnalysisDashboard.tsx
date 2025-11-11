import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Award, Brain, AlertTriangle, TrendingUp, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { AnalysisData } from '../App';
import { motion } from 'motion/react';

interface AnalysisDashboardProps {
  analysisData: AnalysisData;
  onBackToUpload: () => void;
}

export function AnalysisDashboard({ analysisData, onBackToUpload }: AnalysisDashboardProps) {
  const [isSoftSkillsExpanded, setIsSoftSkillsExpanded] = useState(true);
  const [isFullAnalysisExpanded, setIsFullAnalysisExpanded] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      onBackToUpload();
    }, 2000);
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'high':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white">AI Analysis Dashboard</h1>
              <p className="text-zinc-400 text-sm">Structured talent profile and insights</p>
            </div>
            <Button
              onClick={onBackToUpload}
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            >
              <Home className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Top Section - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Best Fit Role */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 p-6 h-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-400 text-sm mb-2">Best Fit Role</p>
                  <h3 className="text-white break-words">{analysisData.bestFitRole}</h3>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Communication Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 p-6 h-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-zinc-400 text-sm mb-2">Communication Score</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className={getScoreColor(analysisData.communicationScore)}>
                      {analysisData.communicationScore}
                    </h3>
                    <span className="text-zinc-500 text-sm">/ 100</span>
                  </div>
                  <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${analysisData.communicationScore}%` }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Technical Debt Risk */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800 p-6 h-full">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-zinc-400 text-sm mb-2">Technical Debt Risk</p>
                  <Badge className={`${getRiskColor(analysisData.technicalDebtRisk)} border mt-1`}>
                    {analysisData.technicalDebtRisk}
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Soft Skills Summary - Collapsible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <button
              onClick={() => setIsSoftSkillsExpanded(!isSoftSkillsExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-blue-400" />
                <h3 className="text-white">Soft Skill Summary</h3>
              </div>
              {isSoftSkillsExpanded ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </button>

            {isSoftSkillsExpanded && (
              <div className="px-6 pb-6 space-y-4">
                {Object.entries(analysisData.softSkillSummary).map(([skill, score]) => (
                  <div key={skill}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-300 capitalize">{skill}</span>
                      <span className={`${getScoreColor(score)}`}>{score}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Full Analysis - Collapsible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <button
              onClick={() => setIsFullAnalysisExpanded(!isFullAnalysisExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-white">Detailed Analysis</h3>
              </div>
              {isFullAnalysisExpanded ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </button>

            {isFullAnalysisExpanded && (
              <div className="px-6 pb-6 space-y-6">
                {/* Strengths */}
                <div>
                  <h4 className="text-green-400 mb-3">Strengths</h4>
                  <ul className="space-y-2">
                    {analysisData.fullAnalysis.strengths.map((strength, index) => (
                      <li key={index} className="flex gap-3 text-zinc-300 text-sm">
                        <span className="text-green-400 flex-shrink-0 mt-1">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div>
                  <h4 className="text-yellow-400 mb-3">Areas for Development</h4>
                  <ul className="space-y-2">
                    {analysisData.fullAnalysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex gap-3 text-zinc-300 text-sm">
                        <span className="text-yellow-400 flex-shrink-0 mt-1">•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-blue-400 mb-3">Recommendations</h4>
                  <ul className="space-y-2">
                    {analysisData.fullAnalysis.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex gap-3 text-zinc-300 text-sm">
                        <span className="text-blue-400 flex-shrink-0 mt-1">→</span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Submit Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20 p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white mb-2">Ready to proceed?</h3>
                <p className="text-zinc-400 text-sm">
                  {isSubmitted
                    ? 'Candidate added to Top Talent Pool successfully!'
                    : 'Approve this analysis to add the candidate to your Top Talent Pool'}
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitted}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white min-w-[200px]"
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submitted
                  </>
                ) : (
                  'Approve & Submit'
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
