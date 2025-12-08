import { useState, useEffect } from 'react';
import { Mail, Lock, Chrome, User, ScanEye } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth } from '../config/firebase';
import { DoodleBackground } from './DoodleBackground';

export function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Send Verification Email with redirect URL
                await sendEmailVerification(userCredential.user, {
                    url: window.location.origin + '/verify-email',
                    handleCodeInApp: true,
                });

                if (name) {
                    await updateProfile(userCredential.user, { displayName: name });
                }

                // We do NOT sign out. The App component will detect !emailVerified and show Pending screen.
                return;
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Email is already in use');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters');
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Check for redirect result when the component mounts (Needed for Prod)
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    // User successfully signed in with Google
                    // The auth state listener in App.tsx/AuthProvider will handle the redirect to dashboard
                }
            } catch (err: any) {
                console.error('Redirect auth error:', err);
                setError('Failed to sign in with Google');
            }
        };

        checkRedirectResult();
    }, []);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();

            // Use Redirect for Production (deployed), Popup for Dev (localhost)
            if (import.meta.env.PROD) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (err: any) {
            console.error('Google login error:', err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign in cancelled');
            } else {
                setError('Failed to sign in with Google');
            }
            setIsLoading(false); // Only needed here, Redirect flow navigates away
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0a0a0a]/95 to-[#1a1a2e]/80" />

            {/* Decorative Doodles */}
            <DoodleBackground />

            <div className="w-full max-w-md relative z-10">
                {/* App Title */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                        <ScanEye className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
                        Interview Lens
                    </h1>
                </div>

                <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-8 shadow-2xl">
                    {/* Logo/Title Section */}
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-lg mb-4">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                        </div>
                        <h1 className="text-white mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
                        <p className="text-[#888888]">
                            {isSignUp ? 'Sign up to get started' : 'Sign in to access your interview transcriptions'}
                        </p>
                    </div>

                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-[#2a2a2a] hover:bg-[#333333] text-white border border-[#3a3a3a] py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span>Continue with Google</span>
                    </button>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#2a2a2a]"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-[#1a1a1a] px-4 text-[#888888]">or</span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit}>
                        {isSignUp && (
                            <div className="mb-4">
                                <label htmlFor="name" className="block text-[#cccccc] mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666666]" />
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        required={isSignUp}
                                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg py-3 pl-11 pr-4 text-white placeholder-[#666666] focus:outline-none focus:border-[#6366f1] transition-colors duration-200"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label htmlFor="email" className="block text-[#cccccc] mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666666]" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg py-3 pl-11 pr-4 text-white placeholder-[#666666] focus:outline-none focus:border-[#6366f1] transition-colors duration-200"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="password" className="block text-[#cccccc] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666666]" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg py-3 pl-11 pr-4 text-white placeholder-[#666666] focus:outline-none focus:border-[#6366f1] transition-colors duration-200"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#5558e3] hover:to-[#7c4de8] text-white py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>

                    {/* Footer Links */}
                    {!isSignUp && (
                        <div className="mt-6 text-center">
                            <a href="#" className="text-[#6366f1] hover:text-[#5558e3] transition-colors duration-200">
                                Forgot password?
                            </a>
                        </div>
                    )}

                    <div className="mt-4 text-center">
                        <span className="text-[#888888]">
                            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                        </span>
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                            }}
                            className="text-[#6366f1] hover:text-[#5558e3] transition-colors duration-200 font-medium"
                        >
                            {isSignUp ? 'Sign in' : 'Sign up'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
