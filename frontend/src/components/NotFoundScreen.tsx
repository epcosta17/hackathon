import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface NotFoundScreenProps {
    onBackToHome: () => void;
}

export function NotFoundScreen({ onBackToHome }: NotFoundScreenProps) {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        duration: 0.8,
                        ease: [0, 0.71, 0.2, 1.01]
                    }}
                    className="mb-8 relative inline-block"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mx-auto transform rotate-12">
                        <Compass className="w-12 h-12 text-white animate-pulse" />
                    </div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="absolute -top-4 -right-4 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-indigo-400 shadow-xl"
                    >
                        404
                    </motion.div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-bold text-white mb-4 tracking-tight"
                >
                    Lost in Space?
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-zinc-400 mb-12 text-lg leading-relaxed"
                >
                    We couldn't find the page you're looking for. It might have been moved, deleted, or perhaps it never existed in this dimension.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <Button
                        onClick={() => window.history.back()}
                        variant="outline"
                        className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 px-8 h-12 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                    <Button
                        onClick={onBackToHome}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 h-12 rounded-xl shadow-lg shadow-indigo-500/20 transition-all font-semibold"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 2 }}
                    className="mt-20 text-zinc-600 text-sm font-medium tracking-widest uppercase"
                >
                    Interview Lens
                </motion.div>
            </div>

            {/* Grid background overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        </div>
    );
}
