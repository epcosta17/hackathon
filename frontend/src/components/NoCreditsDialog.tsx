import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';

interface NoCreditsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToSettings: () => void;
}

export function NoCreditsDialog({ isOpen, onClose, onNavigateToSettings }: NoCreditsDialogProps) {
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
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
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    backgroundColor: '#18181b', // zinc-900
                    border: '1px solid #3f3f46', // zinc-700
                    borderRadius: '16px',
                    padding: '32px',
                    width: '100%',
                    maxWidth: '480px',
                    margin: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    textAlign: 'center',
                    position: 'relative'
                }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px auto'
                }}>
                    <Sparkles style={{ width: '32px', height: '32px', color: 'white' }} />
                </div>

                <h3 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '12px'
                }}>
                    Out of Credits
                </h3>

                <p style={{
                    color: '#a1a1aa',
                    marginBottom: '32px',
                    fontSize: '16px',
                    lineHeight: '1.6'
                }}>
                    You've used all your interview credits. Top up now to continue analyzing your interviews and uncovering insights.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Button
                        onClick={onNavigateToSettings}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(to right, #4f46e5, #7c3aed)', // indigo-600 to violet-600
                            color: 'white',
                            border: 'none',
                            height: '48px',
                            fontSize: '16px',
                            fontWeight: 500
                        }}
                    >
                        Top Up Credits
                    </Button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
