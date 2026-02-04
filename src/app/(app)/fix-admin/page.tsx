"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export default function FixAdminPage() {
    const { currentUser, refreshUser } = useAuth();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleUpgrade = async () => {
        if (!auth.currentUser) {
            setStatus('error');
            setMessage("You must be logged in to perform this action.");
            return;
        }

        setStatus('loading');

        try {
            const uid = auth.currentUser.uid;

            // 1. Check if doc exists
            const userDocRef = doc(db, "users", uid);
            const docSnap = await getDoc(userDocRef);

            const existingData = docSnap.exists() ? docSnap.data() : {};

            // 2. Set as Super Admin
            await setDoc(userDocRef, {
                ...existingData,
                email: auth.currentUser.email,
                role: "Super Admin",
                onboardingCompleted: true,
                updatedAt: new Date(),
                // Ensure placeholder name if missing
                name: existingData.name || auth.currentUser.displayName || "Admin User"
            }, { merge: true });

            // 3. Force refresh context
            await refreshUser();

            setStatus('success');
            setMessage('Account upgraded to Super Admin! Redirecting to dashboard...');

            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error("Upgrade error:", error);
            setStatus('error');
            setMessage(error.message || "Failed to upgrade account.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-orange-200 bg-orange-50/50">
                <CardHeader>
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <ShieldAlert className="h-6 w-6" />
                        <span className="font-bold uppercase text-xs tracking-wider">Account Repair</span>
                    </div>
                    <CardTitle className="text-2xl font-bold">Fix Admin Permissions</CardTitle>
                    <CardDescription>
                        Use this tool if you are stuck in the onboarding loop or missing admin access.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {status === 'success' ? (
                        <Alert className="bg-green-50 border-green-200 text-green-800">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Success!</AlertTitle>
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            {status === 'error' && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <div className="bg-white p-4 rounded-md border text-sm">
                                <p className="font-semibold mb-1">Current Status:</p>
                                <p>Email: <span className="font-mono">{currentUser?.email || auth.currentUser?.email || 'Not logged in'}</span></p>
                                <p>Role: <span className="font-mono">{currentUser?.role || 'User'}</span></p>
                                <p>Onboarding: <span className="font-mono">{String(currentUser?.onboardingCompleted)}</span></p>
                            </div>

                            <Button
                                onClick={handleUpgrade}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                disabled={status === 'loading' || !auth.currentUser}
                            >
                                {status === 'loading' ? 'Upgrading...' : 'Grant Me Super Admin Access'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
