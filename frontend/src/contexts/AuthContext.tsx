/**
 * Authentication Context Provider
 * Manages Firebase authentication state and provides auth functions
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    isAdmin: boolean;
    signOut: () => Promise<void>;
    getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        console.log("AuthProvider: Setting up onAuthStateChanged listener...");
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log("AuthProvider: onAuthStateChanged fired. User:", user ? user.uid : "null");

            if (user) {
                // Check if user is admin via custom claims
                try {
                    const tokenResult = await user.getIdTokenResult();
                    setIsAdmin(!!tokenResult.claims.admin);
                } catch (e) {
                    console.error("Error fetching claims:", e);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }

            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    const getIdToken = async (): Promise<string | null> => {
        if (!currentUser) return null;
        try {
            return await currentUser.getIdToken();
        } catch (error) {
            console.error('Error getting ID token:', error);
            return null;
        }
    };

    const value: AuthContextType = {
        currentUser,
        loading,
        isAdmin,
        signOut,
        getIdToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
