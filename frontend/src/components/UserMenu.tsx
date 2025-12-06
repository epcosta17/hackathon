/**
 * User Menu Component
 * Simple logout icon button
 */
import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function UserMenu() {
    const { signOut } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-gradient-to-r from-slate-700 to-zinc-700 hover:from-slate-600 hover:to-zinc-600 transition-all text-white shadow-lg shadow-black/20 group"
            title="Sign out"
        >
            <LogOut className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
        </button>
    );
}
