import { useState } from 'react';
import { Mail, Lock, Chrome, User } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
                if (name) {
                    await updateProfile(userCredential.user, { displayName: name });
                }
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

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error('Google login error:', err);
            setError('Failed to sign in with Google');
        } finally {
            setIsLoading(false);
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
                        className="w-full bg-white hover:bg-[#f5f5f5] text-black py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Chrome className="w-5 h-5" />
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
