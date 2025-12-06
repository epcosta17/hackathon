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
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white group"
            title="Sign out"
        >
            <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
        </button>
    );
}
