"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RecoveryPage() {
    const [password, setPassword] = useState('');
    const [masterKey, setMasterKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string[]>([]);
    const router = useRouter();

    const addStatus = (msg: string) => setStatus(prev => [...prev, msg]);

    const handleRecovery = async () => {
        if (masterKey !== 'BSA-RECOVERY-2026') {
            alert('Invalid Master Key');
            return;
        }

        setLoading(true);
        setStatus(['Starting recovery process...']);

        const email = 'alain.bertrand.mu@gmail.com';
        const targetPassword = password || 'ab@280765';

        try {
            // 1. Try to sign in first
            addStatus(`Checking if user ${email} exists in Auth...`);
            let user;
            try {
                const userCred = await signInWithEmailAndPassword(auth, email, targetPassword);
                user = userCred.user;
                addStatus('✓ User already exists and password is correct.');
            } catch (signInError: any) {
                if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
                    addStatus('User not found or password incorrect. Attempting to create/reset...');
                    try {
                        const userCred = await createUserWithEmailAndPassword(auth, email, targetPassword);
                        user = userCred.user;
                        addStatus('✓ Successfully created new user in Firebase Auth.');
                    } catch (createError: any) {
                        addStatus(`❌ Error creating user: ${createError.message}`);
                        throw createError;
                    }
                } else {
                    addStatus(`❌ Auth Error: ${signInError.message}`);
                    throw signInError;
                }
            }

            if (!user) throw new Error("Failed to obtain user instance");

            const uid = user.uid;
            addStatus(`User UID: ${uid}`);

            // 2. Ensure Firestore document exists
            addStatus('Ensuring Firestore document exists with Super Admin role...');
            const userDocRef = doc(db, 'users', uid);
            
            await setDoc(userDocRef, {
                email: email,
                name: "Alain BERTRAND (Recovered)",
                role: "Super Admin",
                onboardingCompleted: true,
                onboarding: 'True',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                companyId: 'BSA-MAIN'
            }, { merge: true });

            addStatus('✓ Firestore document created/updated successfully.');
            addStatus('🎉 RECOVERY COMPLETE!');
            addStatus('You can now log in normally.');
            
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (error: any) {
            addStatus(`❌ FATAL ERROR: ${error.message}`);
            console.error("Recovery failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <Card className="w-full max-w-lg shadow-2xl border-orange-500/50">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <ShieldCheck className="h-12 w-12 text-orange-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Emergency System Recovery</CardTitle>
                    <CardDescription>
                        Use this tool to restore Super Admin access and fix database permissions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg flex gap-3 text-orange-200 text-sm">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p>
                            This tool will ensure the account <strong>alain.bertrand.mu@gmail.com</strong> 
                            exists and has full <strong>Super Admin</strong> permissions in the database.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="masterKey">Master Recovery Key</Label>
                            <Input 
                                id="masterKey" 
                                type="password" 
                                placeholder="Enter system master key"
                                value={masterKey}
                                onChange={e => setMasterKey(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Set/Verify Password (Optional)</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="Defaults to ab@280765 if blank"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>

                        <Button 
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12"
                            onClick={handleRecovery}
                            disabled={loading || !masterKey}
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Running Recovery...</>
                            ) : (
                                'Fix Super Admin Account'
                            )}
                        </Button>
                    </div>

                    {status.length > 0 && (
                        <div className="mt-6 p-4 bg-black/50 rounded-md font-mono text-xs space-y-1 max-h-48 overflow-y-auto border border-white/10">
                            {status.map((s, i) => (
                                <div key={i} className={s.startsWith('❌') ? 'text-red-400' : s.startsWith('✓') ? 'text-green-400' : 'text-slate-300'}>
                                    {s}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
