"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function FixUserUIDPage() {
    const { currentUser, isLoading } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('alain.bertrand.mu@gmail.com');

    // Role-based access control - only for logged in users
    React.useEffect(() => {
        if (!isLoading && !currentUser) {
            router.replace('/login');
        }
    }, [currentUser, isLoading, router]);

    if (isLoading) return null;
    if (!currentUser) {
        return null;
    }
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const fixUserUID = async () => {
        setLoading(true);
        setResult('Starting fix...\n');

        try {
            if (!auth.currentUser) {
                setResult('Error: No user logged in via Firebase Auth');
                setLoading(false);
                return;
            }

            const firebaseAuthUID = auth.currentUser.uid;
            setResult(prev => prev + `Firebase Auth UID: ${firebaseAuthUID}\n`);
            setResult(prev => prev + `Email: ${email}\n\n`);

            // Step 1: Check if document already exists with correct UID
            const correctDocRef = doc(db, 'users', firebaseAuthUID);
            const correctDocSnap = await getDoc(correctDocRef);

            if (correctDocSnap.exists()) {
                setResult(prev => prev + '✓ Document already exists with correct UID!\n');
                setResult(prev => prev + JSON.stringify(correctDocSnap.data(), null, 2));
                setLoading(false);
                return;
            }

            setResult(prev => prev + '⚠ No document found with Firebase Auth UID\n');
            setResult(prev => prev + 'Searching for document by email...\n\n');

            // Step 2: Find document by email
            const q = query(collection(db, 'users'), where('email', '==', email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setResult(prev => prev + '❌ No document found with this email in Firestore\n');
                setResult(prev => prev + 'You need to create a user document first.\n');
                setLoading(false);
                return;
            }

            const oldDoc = querySnapshot.docs[0];
            const oldDocId = oldDoc.id;
            const userData = oldDoc.data();

            setResult(prev => prev + `Found document with ID: ${oldDocId}\n`);
            setResult(prev => prev + 'User data:\n');
            setResult(prev => prev + JSON.stringify(userData, null, 2) + '\n\n');

            if (oldDocId === firebaseAuthUID) {
                setResult(prev => prev + '✓ Document ID already matches UID! No fix needed.\n');
                setLoading(false);
                return;
            }

            // Step 3: Copy data to new document with correct UID
            setResult(prev => prev + `Copying data to document with ID: ${firebaseAuthUID}...\n`);

            await setDoc(doc(db, 'users', firebaseAuthUID), {
                ...userData,
                email: email, // Ensure email is set
            });

            setResult(prev => prev + '✓ Created new document with correct UID!\n\n');
            setResult(prev => prev + '🎉 FIX COMPLETE!\n\n');
            setResult(prev => prev + 'Next steps:\n');
            setResult(prev => prev + '1. Visit /clear-auth to clear your session\n');
            setResult(prev => prev + '2. Log in again\n');
            setResult(prev => prev + '3. You should now have the correct role!\n\n');
            setResult(prev => prev + `Note: The old document (ID: ${oldDocId}) still exists. You can delete it manually from Firestore if needed.`);

        } catch (error: any) {
            setResult(prev => prev + `\n❌ Error: ${error.message}\n`);
            console.error('Fix error:', error);
        }

        setLoading(false);
    };

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.push('/tools')} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Admin Tools
                </Button>
            </div>
            <h1 className="text-3xl font-bold mb-6">Fix User UID Mismatch</h1>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Current Status</CardTitle>
                </CardHeader>
                <CardContent>
                    {currentUser ? (
                        <div className="space-y-2">
                            <p><strong>Logged in as:</strong></p>
                            <pre className="bg-muted p-4 rounded-md">
                                {JSON.stringify(currentUser, null, 2)}
                            </pre>
                            {currentUser.role === 'User' && (
                                <p className="text-red-600 font-semibold mt-4">
                                    ⚠ You're showing as "User" role. This needs to be fixed!
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-red-600">Not logged in</p>
                    )}
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Fix UID Mismatch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">User Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                        />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                        <p className="text-sm text-yellow-800">
                            <strong>What this does:</strong>
                            <br />
                            1. Finds your user document in Firestore by email
                            <br />
                            2. Copies it to a new document with ID = your Firebase Auth UID
                            <br />
                            3. This allows AuthContext to find your correct role and settings
                        </p>
                    </div>

                    <Button
                        onClick={fixUserUID}
                        disabled={loading || !currentUser}
                        className="w-full"
                    >
                        {loading ? 'Fixing...' : 'Fix My User UID'}
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-muted p-4 rounded-md whitespace-pre-wrap font-mono text-sm">
                            {result}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
