"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileWarning } from 'lucide-react';

export default function DebugAuthPage() {
    const { currentUser } = useAuth();
    const [rawFirestore, setRawFirestore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRawData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!auth.currentUser) {
                setError("No Firebase Auth user found.");
                setLoading(false);
                return;
            }

            const docRef = doc(db, "users", auth.currentUser.uid);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                setRawFirestore(snap.data());
            } else {
                setRawFirestore("DOCUMENT DOES NOT EXIST");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRawData();
    }, [currentUser]);

    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <FileWarning className="text-yellow-600" />
                    Auth Debugger
                </h1>
                <Button onClick={fetchRawData} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Auth Context State</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-auto text-xs font-mono min-h-[200px]">
                            {JSON.stringify(currentUser, null, 2)}
                        </pre>
                        <div className="mt-4 space-y-2">
                            <p className="font-semibold">Key Checks:</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Role:</div>
                                <div className="font-mono">{currentUser?.role}</div>
                                <div>Onboarding:</div>
                                <div className={`font-mono ${currentUser?.onboardingCompleted ? 'text-green-600' : 'text-red-600'}`}>
                                    {String(currentUser?.onboardingCompleted)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Raw Firestore Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-auto text-xs font-mono min-h-[200px]">
                            {loading ? "Loading..." : JSON.stringify(rawFirestore, null, 2)}
                        </pre>
                        {rawFirestore === "DOCUMENT DOES NOT EXIST" && (
                            <div className="mt-4 p-2 bg-red-100 text-red-800 text-sm rounded border border-red-200">
                                ⚠️ CRITICAL: The user document was not found in the 'users' collection. This causes the App to default to 'User' role and require onboarding.
                            </div>
                        )}
                        {rawFirestore && rawFirestore !== "DOCUMENT DOES NOT EXIST" && !rawFirestore.onboardingCompleted && rawFirestore.role !== 'Super Admin' && (
                            <div className="mt-4 p-2 bg-yellow-100 text-yellow-800 text-sm rounded border border-yellow-200">
                                Note: 'onboardingCompleted' is falsy and role is not Admin. Redirect is expected behavior.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-bold mb-2">Diagnostic Guide</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>If <strong>Raw Firestore Data</strong> says "DOCUMENT DOES NOT EXIST", your user ID is not in the database. Run the Fix tool.</li>
                    <li>If <strong>Role</strong> is "User" but you expect "Super Admin", check the spelling in Firestore.</li>
                    <li>If <strong>Onboarding</strong> is false, the system is correctly redirecting you.</li>
                </ul>
            </div>
        </div>
    );
}
