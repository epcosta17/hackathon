import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Settings, CheckCircle2, RotateCcw, Zap, Brain } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Define the available blocks matching the backend
export const PROMPT_BLOCKS = [
    {
        id: 'executive_summary',
        title: 'Executive Summary',
        description: 'High-level overview for hiring managers (2-3 sentences).'
    },
    {
        id: 'general_comments',
        title: 'General Comments',
        description: 'Overall tone, attitude, structure, and platform details.'
    },
    {
        id: 'strengths_weaknesses',
        title: 'Strengths & Growth',
        description: 'Balanced view of top qualities and areas for improvement.'
    },
    {
        id: 'key_points',
        title: 'Key Technical Points',
        description: '3-5 key technical points emphasized by the interviewer.'
    },
    {
        id: 'coding_challenge',
        title: 'Coding Challenge',
        description: 'Details about the coding task, follow-ups, and required knowledge.'
    },
    {
        id: 'technologies',
        title: 'Technologies',
        description: 'List of technologies mentioned with timestamps.'
    },
    {
        id: 'thinking_process',
        title: 'Thinking Process',
        description: 'Analysis of problem-solving approach and logical flow.'
    },
    {
        id: 'qa_topics',
        title: 'Q&A Topics',
        description: 'Non-technical and situational Q&A topics.'
    },
    {
        id: 'statistics',
        title: 'Statistics',
        description: 'Quantitative analysis, scores, and metrics.'
    }
];

interface SettingsScreenProps {
    onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
    const [enabledBlocks, setEnabledBlocks] = useState<string[]>(PROMPT_BLOCKS.map(b => b.id));
    const [modelMode, setModelMode] = useState<'fast' | 'deep'>('fast');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                if (!auth.currentUser) return;
                const settingsRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'analysis');
                const snap = await getDoc(settingsRef);

                if (snap.exists()) {
                    const data = snap.data();
                    if (data.enabled_blocks && Array.isArray(data.enabled_blocks)) {
                        setEnabledBlocks(data.enabled_blocks);
                    }
                    if (data.model_mode) {
                        setModelMode(data.model_mode);
                    }
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
                toast.error('Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const handleToggle = (blockId: string) => {
        setEnabledBlocks(prev => {
            if (prev.includes(blockId)) {
                return prev.filter(id => id !== blockId);
            } else {
                return [...prev, blockId];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (!auth.currentUser) {
                toast.error("You must be logged in to save settings.");
                return;
            }

            const settingsRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'analysis');
            await setDoc(settingsRef, {
                enabled_blocks: enabledBlocks,
                model_mode: modelMode,
                updated_at: new Date().toISOString()
            }, { merge: true });

            toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setEnabledBlocks(PROMPT_BLOCKS.map(b => b.id));
        setModelMode('fast');
        toast.info("Settings reset to default (unsaved)");
    };

    return (
        <div className="h-screen max-h-screen flex flex-col bg-zinc-950 overflow-hidden">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
                <div className="w-full px-8 py-4">
                    <div className="flex items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Settings className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-white text-xl font-bold leading-tight">Analysis Configuration</h1>
                                <p className="text-zinc-400 text-sm">Customize your interview report structure</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                onClick={onBack}
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset Defaults
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                            >
                                {saving ? (
                                    'Saving...'
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* Model Capabilities Section */}
                    <div className="space-y-4">
                        <h2 className="text-zinc-400 font-medium uppercase tracking-wider text-sm px-1">Model Capability</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onClick={() => setModelMode('fast')}
                                className={`p-6 rounded-xl border cursor-pointer transition-all ${modelMode === 'fast'
                                    ? 'bg-zinc-900 border-indigo-500 ring-1 ring-indigo-500/50'
                                    : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/60'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    {modelMode === 'fast' && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                                </div>
                                <h3 className="text-white font-bold mb-1">Fast Analysis</h3>
                                <p className="text-zinc-400 text-sm mb-3">Standard Model</p>
                                <p className="text-xs text-zinc-500">Optimized for speed. Good for quick summaries and surface-level insights. Default option.</p>
                            </div>

                            <div
                                onClick={() => setModelMode('deep')}
                                className={`p-6 rounded-xl border cursor-pointer transition-all ${modelMode === 'deep'
                                    ? 'bg-zinc-900 border-indigo-500 ring-1 ring-indigo-500/50'
                                    : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/60'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                                        <Brain className="w-5 h-5" />
                                    </div>
                                    {modelMode === 'deep' && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                                </div>
                                <h3 className="text-white font-bold mb-1">Deep Analysis</h3>
                                <p className="text-zinc-400 text-sm mb-3">Enhanced Reasoning</p>
                                <p className="text-xs text-zinc-500">Enhanced reasoning capabilities. Better for complex thinking process analysis and nuance.</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Blocks Section */}
                    <div className="space-y-4">
                        <h2 className="text-zinc-400 font-medium uppercase tracking-wider text-sm px-1">Content Layers</h2>
                        <div className="grid gap-4">
                            {loading ? (
                                <div className="text-zinc-500 text-center py-12">Loading settings...</div>
                            ) : (
                                PROMPT_BLOCKS.map(block => (
                                    <motion.div
                                        key={block.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-6 rounded-xl border transition-all duration-200 ${enabledBlocks.includes(block.id)
                                            ? 'bg-zinc-900/50 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                            : 'bg-zinc-900/40 border-zinc-700/50 hover:bg-zinc-900/60'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className={`text-lg font-medium ${enabledBlocks.includes(block.id) ? 'text-white' : 'text-zinc-300'
                                                        }`}>
                                                        {block.title}
                                                    </h3>
                                                    {enabledBlocks.includes(block.id) && (
                                                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                                    )}
                                                </div>
                                                <p className="text-zinc-500 text-sm">{block.description}</p>
                                            </div>
                                            <Switch
                                                checked={enabledBlocks.includes(block.id)}
                                                onCheckedChange={() => handleToggle(block.id)}
                                                className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-zinc-700"
                                            />
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
