import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../config/firebase';
import { CheckCheck, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { DoodleBackground } from './DoodleBackground';

export function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        const verify = async () => {
            const mode = searchParams.get('mode');
            const oobCode = searchParams.get('oobCode');

            // 1. Try to verify with code
            if (mode === 'verifyEmail' && oobCode) {
                try {
                    await applyActionCode(auth, oobCode);
                    setStatus('success');
                    setMessage('Email verified successfully! You can now sign in.');
                    return;
                } catch (error: any) {
                    console.warn('Verification with code failed, checking user status:', error);
                    // If code fails (e.g. used), fall through to check if user is already verified
                }
            }

            // 2. If code missing or failed, check if user is already verified
            // This handles cases where Firebase handler consumed code -> redirected -> params lost
            if (auth.currentUser) {
                try {
                    await auth.currentUser.reload();
                    if (auth.currentUser.emailVerified) {
                        setStatus('success');
                        setMessage('Email is verified! You can proceed.');
                        return;
                    }
                } catch (e) {
                    console.error("Error reloading user", e);
                }
            }

            // 3. Failed
            setStatus('error');
            setMessage('Invalid verification link or unable to verify.');
        };

        verify();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0a0a0a]/95 to-[#1a1a2e]/80" />
            <DoodleBackground />

            <div className="w-full max-w-md relative z-10 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-8 shadow-2xl text-center">
                <div className="mb-6 flex justify-center">
                    {status === 'loading' && (
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center animate-pulse">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                            <CheckCheck className="w-8 h-8 text-green-400" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-400" />
                        </div>
                    )}
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">
                    {status === 'loading' && 'Verifying Email'}
                    {status === 'success' && 'Email Verified!'}
                    {status === 'error' && 'Verification Failed'}
                </h1>

                <p className="text-zinc-400 mb-8">{message}</p>

                {status !== 'loading' && (
                    <Button
                        onClick={() => navigate('/')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        Return to Login
                    </Button>
                )}
            </div>
        </div>
    );
}
