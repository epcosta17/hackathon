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
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700 group"
            title="Sign out"
        >
            <LogOut className="w-5 h-5 text-zinc-400 group-hover:text-red-400 transition-colors" />
        </button>
    );
}
