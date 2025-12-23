import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, ArrowLeft, Settings, CheckCircle2, RotateCcw, Zap, Brain, Key, Trash2, Copy, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { getJSON, postJSON, authenticatedFetch } from '../utils/api';
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
    const navigate = useNavigate();
    const [enabledBlocks, setEnabledBlocks] = useState<string[]>(() => {
        const cached = localStorage.getItem('settings_enabled_blocks');
        return cached ? JSON.parse(cached) : PROMPT_BLOCKS.map(b => b.id);
    });
    const [modelMode, setModelMode] = useState<'fast' | 'deep'>(() => {
        const cached = localStorage.getItem('settings_model_mode') as 'fast' | 'deep';
        return cached || 'fast';
    });
    const [loading, setLoading] = useState(() => {
        // Only show loading if we don't have cached data
        return !localStorage.getItem('settings_enabled_blocks') || !localStorage.getItem('settings_model_mode');
    });
    const location = useLocation();
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'analysis' | 'api'>(() => {
        if (location.hash === '#api') return 'api';
        if (location.hash === '#analysis') return 'analysis';
        return 'analysis';
    });

    // API Keys State
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [webhookSecret, setWebhookSecret] = useState(() => {
        return localStorage.getItem('settings_webhook_secret') || '';
    });
    const [showWebhookSecret, setShowWebhookSecret] = useState(false);
    const [deleteConfirmKeyId, setDeleteConfirmKeyId] = useState<string | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                if (!auth.currentUser) return;

                // Load analysis settings
                const settingsRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'analysis');
                const snap = await getDoc(settingsRef);

                if (snap.exists()) {
                    const data = snap.data();
                    if (data.enabled_blocks && Array.isArray(data.enabled_blocks)) {
                        setEnabledBlocks(data.enabled_blocks);
                        localStorage.setItem('settings_enabled_blocks', JSON.stringify(data.enabled_blocks));
                    }
                    if (data.model_mode) {
                        setModelMode(data.model_mode);
                        localStorage.setItem('settings_model_mode', data.model_mode);
                    }
                    if (data.webhook_secret) {
                        setWebhookSecret(data.webhook_secret);
                        localStorage.setItem('settings_webhook_secret', data.webhook_secret);
                    }
                }

                // Load API Keys
                const keys = await getJSON('/v1/auth/api-keys');
                setApiKeys(keys);
            } catch (error) {
                console.error('Failed to load settings:', error);
                toast.error('Failed to load settings or API keys');
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
                webhook_secret: webhookSecret,
                updated_at: new Date().toISOString()
            }, { merge: true });

            // Update cache
            localStorage.setItem('settings_enabled_blocks', JSON.stringify(enabledBlocks));
            localStorage.setItem('settings_model_mode', modelMode);

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

    const handleGenerateKey = async () => {
        setIsGenerating(true);
        try {
            const response = await postJSON('/v1/auth/api-keys', {});
            const data = await response.json();
            setNewKey(data.api_key);

            // Refresh keys list
            const keys = await getJSON('/v1/auth/api-keys');
            setApiKeys(keys);
            toast.success("New API key generated!");
        } catch (error) {
            console.error('Failed to generate API key:', error);
            toast.error("Failed to generate API key");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevokeKey = (keyHash: string) => {
        setDeleteConfirmKeyId(keyHash);
    };

    const confirmRevokeKey = async () => {
        if (!deleteConfirmKeyId) return;
        const keyHash = deleteConfirmKeyId;
        setDeleteConfirmKeyId(null);

        try {
            const response = await authenticatedFetch(`/v1/auth/api-keys/${keyHash}`, { method: 'DELETE' });
            if (response.ok) {
                setApiKeys(prev => prev.filter(k => k.id !== keyHash));
                toast.success("API key revoked");
            } else {
                toast.error("Failed to revoke API key");
            }
        } catch (error) {
            console.error('Failed to revoke API key:', error);
            toast.error("Failed to revoke API key");
        }
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard");
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === id
                ? 'bg-indigo-600/10 text-indigo-400'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
        >
            <Icon className={`w-4 h-4 ${activeTab === id ? 'text-indigo-400' : 'text-zinc-500'}`} />
            {label}
        </button>
    );

    return (
        <div className="h-screen max-h-screen flex flex-col bg-zinc-950 overflow-hidden">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
                <div className="w-full px-8 py-4">
                    <div className="flex items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Settings className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-white text-xl font-bold leading-tight">Settings</h1>
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
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                            >
                                {saving ? 'Saving...' : (
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

            <div className="flex-1 flex overflow-hidden justify-center overflow-y-auto">
                <div className="w-full max-w-6xl flex overflow-hidden">
                    {/* Sidebar */}
                    <aside className="w-64 bg-zinc-950/50 p-6 flex flex-col gap-1 flex-shrink-0">
                        <SidebarItem id="analysis" label="Analysis Blocks" icon={Brain} />
                        <SidebarItem id="api" label="API & Integrations" icon={Key} />

                        <div className="mt-auto pt-6 border-t border-zinc-800">
                            <Button
                                onClick={handleReset}
                                variant="ghost"
                                className="w-full justify-start text-zinc-500 hover:text-red-400 hover:bg-red-500/5 px-4"
                            >
                                <RotateCcw className="w-4 h-4 mr-3" />
                                Reset Defaults
                            </Button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto p-8 lg:p-12">
                        <div className="max-w-4xl space-y-12">
                            <AnimatePresence mode="wait">
                                {activeTab === 'analysis' && (
                                    <motion.div
                                        key="analysis"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="space-y-12"
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
                                            className="space-y-4"
                                        >
                                            <div>
                                                <h2 className="text-white text-lg font-bold">Model Capability</h2>
                                                <p className="text-zinc-500 text-sm">Choose the engine that powers your analysis</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <motion.div
                                                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(24, 24, 27, 0.6)' }}
                                                    whileTap={{ scale: 0.99 }}
                                                    onClick={() => setModelMode('fast')}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${modelMode === 'fast'
                                                        ? 'bg-zinc-900 border-indigo-500 ring-1 ring-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                                                        : 'bg-zinc-900/40 border-zinc-800'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                                <Zap className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-white font-bold leading-none">Fast Analysis</h3>
                                                                <p className="text-zinc-400 text-[10px] mt-1 uppercase tracking-wider font-semibold">Standard Model</p>
                                                            </div>
                                                        </div>
                                                        {modelMode === 'fast' && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-zinc-500 leading-relaxed">Optimized for speed. Good for quick summaries and surface-level insights.</p>
                                                </motion.div>

                                                <motion.div
                                                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(24, 24, 27, 0.6)' }}
                                                    whileTap={{ scale: 0.99 }}
                                                    onClick={() => setModelMode('deep')}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${modelMode === 'deep'
                                                        ? 'bg-zinc-900 border-indigo-500 ring-1 ring-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                                                        : 'bg-zinc-900/40 border-zinc-800'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                                                                <Brain className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-white font-bold leading-none">Deep Analysis</h3>
                                                                <p className="text-zinc-400 text-[10px] mt-1 uppercase tracking-wider font-semibold">Enhanced Reasoning</p>
                                                            </div>
                                                        </div>
                                                        {modelMode === 'deep' && (
                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-zinc-500 leading-relaxed">Enhanced reasoning capabilities. Better for complex thinking and nuance.</p>
                                                </motion.div>
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                                            className="space-y-4"
                                        >
                                            <div>
                                                <h2 className="text-white text-lg font-bold">Content Layers</h2>
                                                <p className="text-zinc-500 text-sm">Toggle specific modules in your generated reports</p>
                                            </div>
                                            <div className="grid gap-3">
                                                {loading && !localStorage.getItem('settings_enabled_blocks') ? (
                                                    <div className="text-zinc-500 text-center py-12">Loading settings...</div>
                                                ) : (
                                                    PROMPT_BLOCKS.map(block => (
                                                        <div
                                                            key={block.id}
                                                            className={`p-4 rounded-xl border transition-all duration-200 ${enabledBlocks.includes(block.id)
                                                                ? 'bg-zinc-900/50 border-indigo-500/30'
                                                                : 'bg-zinc-900/10 border-zinc-800 hover:bg-zinc-900/40'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="flex-1 text-left">
                                                                    <div className="flex items-center gap-3">
                                                                        <h3 className={`text-sm font-medium ${enabledBlocks.includes(block.id) ? 'text-white' : 'text-zinc-400'}`}>
                                                                            {block.title}
                                                                        </h3>
                                                                    </div>
                                                                    <p className="text-zinc-500 text-xs mt-0.5">{block.description}</p>
                                                                </div>
                                                                <Switch
                                                                    checked={enabledBlocks.includes(block.id)}
                                                                    onCheckedChange={() => handleToggle(block.id)}
                                                                    className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-zinc-800 border-zinc-700"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {activeTab === 'api' && (
                                    <motion.div
                                        key="api"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="space-y-8"
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
                                            className="flex items-center justify-between"
                                        >
                                            <div>
                                                <h2 className="text-white text-lg font-bold">API Access</h2>
                                                <p className="text-zinc-500 text-sm">Manage your secret keys to access our API</p>
                                            </div>
                                            <Button
                                                onClick={handleGenerateKey}
                                                disabled={isGenerating}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                            >
                                                <Key className="w-4 h-4 mr-2" />
                                                Generate New Key
                                            </Button>
                                        </motion.div>

                                        {/* New Key Display */}
                                        {newKey && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 space-y-4"
                                            >
                                                <div className="flex items-center gap-3 text-indigo-400" >
                                                    <AlertCircle className="w-5 h-5" />
                                                    <span className="font-bold">Save your new API key</span>
                                                </div>
                                                <p className="text-zinc-400 text-sm">
                                                    For security, this key will only be shown once. Please store it securely.
                                                </p>
                                                <div className="flex items-center gap-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                                    <code className="flex-1 text-white font-mono text-xs">{newKey}</code>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => copyToClipboard(newKey)}
                                                        className="text-zinc-400 hover:text-white"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setNewKey(null)}
                                                        className="text-zinc-500 hover:text-white px-3"
                                                    >
                                                        Done
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}

                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                                        >
                                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                                            <th className="px-6 py-4 font-medium text-zinc-400">Key Prefix</th>
                                                            <th className="px-6 py-4 font-medium text-zinc-400">Status</th>
                                                            <th className="px-6 py-4 font-medium text-zinc-400 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-800">
                                                        {apiKeys.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                                                                    No active API keys found
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            apiKeys.map(key => (
                                                                <tr key={key.id} className="group hover:bg-zinc-800/30 transition-colors">
                                                                    <td className="px-6 py-4 font-mono text-zinc-300">{key.prefix}</td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                            Active
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => handleRevokeKey(key.id)}
                                                                            className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Webhooks Section */}
                                            <div className="space-y-6 pt-10 mt-10 border-t border-zinc-800">
                                                <div>
                                                    <h2 className="text-white text-lg font-bold">Webhooks</h2>
                                                    <p className="text-zinc-500 text-sm">Configure how we send data to your services</p>
                                                </div>

                                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-4">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                            <Zap className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white font-medium">Webhook Secret</h3>
                                                            <p className="text-zinc-500 text-xs mt-0.5">Used to sign payloads with HMAC-SHA256</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type={showWebhookSecret ? "text" : "password"}
                                                                value={webhookSecret}
                                                                onChange={(e) => setWebhookSecret(e.target.value)}
                                                                placeholder="Enter secret for signing..."
                                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                                            >
                                                                {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                                                        <p className="text-xs text-indigo-300 leading-relaxed flex items-start gap-2">
                                                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                            <span>
                                                                Include `X-Interview-Lens-Signature` in your webhook headers to verify authenticity.
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        navigate('/docs/webhooks');
                                                                    }}
                                                                    className="ml-1 underline font-medium hover:text-white transition-colors"
                                                                >
                                                                    Read the Docs
                                                                </button>
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </main>
                </div>
            </div>

            {deleteConfirmKeyId !== null && typeof document !== 'undefined' && createPortal(
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
                    onClick={() => setDeleteConfirmKeyId(null)}
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
                            maxWidth: '420px',
                            margin: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <AlertCircle style={{ width: '24px', height: '24px', color: 'white' }} />
                            </div>
                            <div>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: 'white',
                                    marginBottom: '4px'
                                }}>
                                    Revoke API Key
                                </h3>
                                <p style={{
                                    color: '#a1a1aa',
                                    fontSize: '14px',
                                    margin: 0
                                }}>
                                    This action cannot be undone
                                </p>
                            </div>
                        </div>

                        <p style={{
                            color: '#d4d4d8',
                            marginBottom: '24px',
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}>
                            Are you sure you want to revoke this API key? Any applications or services currently using this key will immediately lose access.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button
                                onClick={() => setDeleteConfirmKeyId(null)}
                                variant="outline"
                                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmRevokeKey}
                                style={{
                                    background: 'linear-gradient(to right, #ef4444, #f43f5e)',
                                    color: 'white',
                                    border: 'none'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #dc2626, #e11d48)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #ef4444, #f43f5e)'}
                            >
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Revoke Key
                            </Button>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
}
