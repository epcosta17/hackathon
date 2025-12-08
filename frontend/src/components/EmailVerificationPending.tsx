import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification, User } from 'firebase/auth';
import { Mail, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { DoodleBackground } from './DoodleBackground';

export function EmailVerificationPending() {
    const { currentUser, signOut } = useAuth();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        const interval = setInterval(async () => {
            try {
                // Reload user to get latest emailVerified status
                await currentUser.reload();
                if (currentUser.emailVerified) {
                    // Force token refresh to update claims
                    await currentUser.getIdToken(true);
                    // Reload page to sync everything perfectly (simple & robust)
                    window.location.reload();
                }
            } catch (e) {
                console.error("Error polling verification status", e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentUser]);

    const handleResend = async () => {
        if (!currentUser) return;
        setSending(true);
        try {
            await sendEmailVerification(currentUser);
            setSent(true);
            setTimeout(() => setSent(false), 5000); // Reset "Sent" message after 5s
        } catch (error) {
            console.error("Error sending verification email", error);
            alert("Failed to send email. Please try again later.");
        } finally {
            setSending(false);
        }
    };

    const handleManualCheck = async () => {
        if (!currentUser) return;
        setChecking(true);
        try {
            await currentUser.reload();
            if (currentUser.emailVerified) {
                await currentUser.getIdToken(true);
                window.location.reload();
            } else {
                // Just a visual feedback
                setTimeout(() => setChecking(false), 1000);
            }
        } catch (e) {
            setChecking(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0a0a0a]/95 to-[#1a1a2e]/80" />
            <DoodleBackground />

            <div className="w-full max-w-md relative z-10 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-8 shadow-2xl text-center">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-indigo-400" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Check your Inbox</h1>
                <p className="text-zinc-400 mb-6">
                    We've sent a verification link to <span className="text-white font-medium">{currentUser?.email}</span>.
                </p>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6">
                    <p className="text-yellow-200 text-sm">
                        ⚠️ Please check your <strong>Spam</strong> or <strong>Junk</strong> folder if you don't see the email.
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={handleManualCheck}
                        disabled={checking}
                        variant="outline"
                        className="w-full border-zinc-700 hover:bg-zinc-800 text-white"
                    >
                        {checking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        I've Verified My Email
                    </Button>

                    <Button
                        onClick={handleResend}
                        disabled={sending || sent}
                        variant="ghost"
                        className="w-full text-indigo-400 hover:text-indigo-300 hover:bg-transparent"
                    >
                        {sending ? 'Sending...' : sent ? 'Email Sent!' : 'Resend Verification Email'}
                    </Button>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800">
                    <button
                        onClick={() => signOut()}
                        className="text-zinc-500 hover:text-zinc-400 text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
                    >
                        <LogOut className="w-3 h-3" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
