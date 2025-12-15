import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Search, Shield, Plus, DollarSign, Users, FileBarChart } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { authenticatedFetch } from '../utils/api';
import { toast } from 'sonner';

interface AdminScreenProps {
    onBack: () => void;
}

interface User {
    uid: string;
    email: string;
    credits: number;
    interview_count: number;
    created_at: string;
    last_login: string;
}

interface Stats {
    total_users: number;
    total_credits: number;
    total_interviews: number;
}

export function AdminScreen({ onBack }: AdminScreenProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [creditAmounts, setCreditAmounts] = useState<{ [key: string]: string }>({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, statsRes] = await Promise.all([
                authenticatedFetch('/v1/admin/users'),
                authenticatedFetch('/v1/admin/stats')
            ]);

            if (usersRes.ok) {
                setUsers(await usersRes.json());
            }
            if (statsRes.ok) {
                setStats(await statsRes.json());
            }
        } catch (error) {
            console.error("Admin fetch error:", error);
            toast.error("Failed to load admin data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddCredits = async (uid: string) => {
        const amountStr = creditAmounts[uid];
        const amount = parseInt(amountStr);

        if (!amount || isNaN(amount) || amount === 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            const res = await authenticatedFetch(`/v1/admin/users/${uid}/credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });

            if (res.ok) {
                toast.success(`Added ${amount} credits`);
                // Refresh locally
                setUsers(users.map(u =>
                    u.uid === uid ? { ...u, credits: u.credits + amount } : u
                ));
                setCreditAmounts({ ...creditAmounts, [uid]: '' });
            } else {
                toast.error("Failed to add credits");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error processing request");
        }
    };

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.uid.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onBack} className="text-zinc-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Shield className="w-6 h-6 text-indigo-500" />
                                Admin Dashboard
                            </h1>
                            <p className="text-zinc-400 text-sm">Manage users and credits</p>
                        </div>
                    </div>
                    <Button onClick={fetchData} variant="outline" className="gap-2 border-zinc-700">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl flex items-center gap-4"
                    >
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-zinc-400 text-sm">Total Users</p>
                            {loading ? (
                                <Skeleton className="h-8 w-16 mt-1 bg-zinc-800" />
                            ) : (
                                <h3 className="text-2xl font-bold">{stats?.total_users || '-'}</h3>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl flex items-center gap-4"
                    >
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-zinc-400 text-sm">Total Credits Distributed</p>
                            {loading ? (
                                <Skeleton className="h-8 w-16 mt-1 bg-zinc-800" />
                            ) : (
                                <h3 className="text-2xl font-bold">{stats?.total_credits || '-'}</h3>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl flex items-center gap-4"
                    >
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <FileBarChart className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-zinc-400 text-sm">Interviews</p>
                            {loading ? (
                                <Skeleton className="h-8 w-16 mt-1 bg-zinc-800" />
                            ) : (
                                <h3 className="text-2xl font-bold">{stats?.total_interviews !== undefined ? stats.total_interviews : '-'}</h3>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Users Table */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 max-w-sm">
                        <Search className="w-4 h-4 text-zinc-400 ml-2" />
                        <Input
                            placeholder="Search users by email or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-none bg-transparent focus-visible:ring-0 h-8"
                        />
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-zinc-900/80">
                                <TableRow className="border-zinc-800 hover:bg-zinc-900/80">
                                    <TableHead className="text-zinc-400">User</TableHead>
                                    <TableHead className="text-zinc-400">Credits</TableHead>
                                    <TableHead className="text-zinc-400">Interviews</TableHead>
                                    <TableHead className="text-zinc-400">Joined</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="wait">
                                    {loading ? (
                                        // Skeleton Rows
                                        [...Array(5)].map((_, i) => (
                                            <TableRow key={`skeleton-${i}`} className="border-zinc-800">
                                                <TableCell><Skeleton className="h-4 w-32 bg-zinc-800" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-20 rounded-full bg-zinc-800" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-8 bg-zinc-800" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-24 bg-zinc-800" /></TableCell>
                                                <TableCell><div className="flex justify-end gap-2">
                                                    <Skeleton className="h-8 w-20 bg-zinc-800" />
                                                    <Skeleton className="h-8 w-8 bg-zinc-800" />
                                                </div></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        filteredUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                                                    No users found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredUsers.map((user, index) => (
                                                <motion.tr
                                                    key={user.uid}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="border-b transition-colors hover:bg-zinc-900/50 data-[state=selected]:bg-zinc-900 border-zinc-800"
                                                >
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium text-white">{user.email || 'No Email'}</div>
                                                            <div className="text-xs text-zinc-500 font-mono">{user.uid}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.credits > 0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-400'
                                                            }`}>
                                                            {user.credits} Credits
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-400 text-sm">
                                                        <span className="inline-flex items-center gap-1">
                                                            <FileBarChart className="w-3 h-3 text-purple-400" />
                                                            {user.interview_count}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-400 text-sm">
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                className="w-20 h-8 bg-zinc-950 border-zinc-800"
                                                                value={creditAmounts[user.uid] || ''}
                                                                onChange={(e) => setCreditAmounts({ ...creditAmounts, [user.uid]: e.target.value })}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => handleAddCredits(user.uid)}
                                                                className="h-8 hover:bg-indigo-600 hover:text-white"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </motion.tr>
                                            ))
                                        )
                                    )}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </div>

            </div>
        </div>
    );
}
