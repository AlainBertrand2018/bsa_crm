"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usersService } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function SetupUsersPage() {
    const { currentUser, isLoading } = useAuth();
    const router = useRouter();
    const [result, setResult] = useState<string>('');
    const [firestoreUsers, setFirestoreUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Role-based access control
    React.useEffect(() => {
        if (!isLoading && currentUser) {
            if (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin') {
                router.replace('/dashboard');
            }
        }
    }, [currentUser, isLoading, router]);

    if (isLoading) return null;
    if (!currentUser || (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin')) {
        return null;
    }

    const checkFirestoreUsers = async () => {
        setLoading(true);
        try {
            const users = await usersService.getAll();
            setFirestoreUsers(users as any[]);
            setResult(`Found ${users.length} users in Firestore`);
        } catch (error: any) {
            setResult(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    const createAuthUser = async (email: string, password: string, userData: any) => {
        setLoading(true);
        try {
            // Create in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Determine onboardingCompleted based on role
            const onboardingCompleted = userData.role === 'Super Admin' || userData.role === 'Admin';

            // Create in Firestore with the same UID
            await setDoc(doc(db, 'users', uid), {
                email: userData.email,
                name: userData.name,
                role: userData.role,
                onboardingCompleted: onboardingCompleted,
            });

            setResult(`Successfully created user: ${email} (UID: ${uid}, Role: ${userData.role}, Onboarding: ${onboardingCompleted ? 'Completed' : 'Required'})`);
        } catch (error: any) {
            setResult(`Error creating user: ${error.message}`);
        }
        setLoading(false);
    };

    const setupDefaultUsers = async () => {
        setLoading(true);
        const defaultUsers = [
            { email: "alain.bertrand.mu@gmail.com", password: "Ab@280765", name: "Alain BERTRAND", role: "Super Admin" },
            { email: "wesley@fids-maurice.online", password: "Wr@280765", name: "Wesley ROSE", role: "User" },
            { email: "stephan@fids-maurice.online", password: "St@280765", name: "Stephan TOURMENTIN", role: "User" },
            { email: "catheleen@fids-maurice.online", password: "Cm@280765", name: "Catheleen MARIMOOTOO", role: "User" },
        ];

        let results = [];
        for (const user of defaultUsers) {
            try {
                await createAuthUser(user.email, user.password, user);
                results.push(`✓ ${user.email}`);
            } catch (error: any) {
                if (error.code === 'auth/email-already-in-use') {
                    results.push(`⚠ ${user.email} - Already exists`);
                } else {
                    results.push(`✗ ${user.email} - ${error.message}`);
                }
            }
        }
        setResult(results.join('\n'));
        setLoading(false);
    };

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.push('/tools')} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Admin Tools
                </Button>
            </div>
            <h1 className="text-3xl font-bold mb-6">User Setup & Diagnostics</h1>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Check Firestore Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={checkFirestoreUsers} disabled={loading}>
                        Check Firestore Users
                    </Button>

                    {firestoreUsers.length > 0 && (
                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Users in Firestore:</h3>
                            <pre className="bg-muted p-4 rounded-md overflow-auto">
                                {JSON.stringify(firestoreUsers, null, 2)}
                            </pre>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Setup Default Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        This will create users in Firebase Authentication AND Firestore.
                        If they already exist, it will skip them.
                    </p>
                    <Button onClick={setupDefaultUsers} disabled={loading}>
                        Setup All Default Users
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                            {result}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
