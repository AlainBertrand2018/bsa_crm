"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function AuthDiagnosticsPage() {
    const { currentUser, isLoading } = useAuth();
    const router = useRouter();
    const [firebaseAuthUser, setFirebaseAuthUser] = useState<any>(null);
    const [firestoreUserDoc, setFirestoreUserDoc] = useState<any>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Role-based access control
    useEffect(() => {
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
    const [userByEmail, setUserByEmail] = useState<any>(null);

    useEffect(() => {
        if (auth.currentUser) {
            setFirebaseAuthUser({
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName,
            });

            // Fetch Firestore document by UID
            getDoc(doc(db, 'users', auth.currentUser.uid)).then((docSnap) => {
                if (docSnap.exists()) {
                    setFirestoreUserDoc({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setFirestoreUserDoc(null);
                }
            });

            // Try to find user by email in Firestore
            const q = query(collection(db, 'users'), where('email', '==', auth.currentUser.email));
            getDocs(q).then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    setUserByEmail({ id: doc.id, ...doc.data() });
                }
            });
        }
    }, []);

    const fetchAllUsers = async () => {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setAllUsers(users);
    };

    return (
        <div className="container mx-auto p-8 max-w-6xl">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.push('/tools')} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Admin Tools
                </Button>
            </div>
            <h1 className="text-3xl font-bold mb-6">Authentication Diagnostics</h1>

            <div className="grid gap-6">
                {/* Current User from Context */}
                <Card>
                    <CardHeader>
                        <CardTitle>Current User (from AuthContext)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-muted p-4 rounded-md overflow-auto">
                            {JSON.stringify(currentUser, null, 2)}
                        </pre>
                    </CardContent>
                </Card>

                {/* Firebase Auth User */}
                <Card>
                    <CardHeader>
                        <CardTitle>Firebase Auth User (from auth.currentUser)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-muted p-4 rounded-md overflow-auto">
                            {JSON.stringify(firebaseAuthUser, null, 2)}
                        </pre>
                    </CardContent>
                </Card>

                {/* Firestore User Document by UID */}
                <Card className={firestoreUserDoc ? 'border-green-500' : 'border-red-500'}>
                    <CardHeader>
                        <CardTitle>
                            Firestore User Document (by UID: {firebaseAuthUser?.uid})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {firestoreUserDoc ? (
                            <>
                                <p className="text-green-600 font-semibold mb-2">✓ Document Found</p>
                                <pre className="bg-muted p-4 rounded-md overflow-auto">
                                    {JSON.stringify(firestoreUserDoc, null, 2)}
                                </pre>
                            </>
                        ) : (
                            <p className="text-red-600 font-semibold">
                                ✗ No Firestore document found with this UID
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* User by Email */}
                {userByEmail && (
                    <Card className={userByEmail.id === firebaseAuthUser?.uid ? 'border-green-500' : 'border-yellow-500'}>
                        <CardHeader>
                            <CardTitle>Firestore User Document (by Email)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {userByEmail.id === firebaseAuthUser?.uid ? (
                                <p className="text-green-600 font-semibold mb-2">✓ UID Matches!</p>
                            ) : (
                                <p className="text-yellow-600 font-semibold mb-2">
                                    ⚠ UID Mismatch! Auth UID: {firebaseAuthUser?.uid} vs Firestore ID: {userByEmail.id}
                                </p>
                            )}
                            <pre className="bg-muted p-4 rounded-md overflow-auto">
                                {JSON.stringify(userByEmail, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {/* All Users */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Users in Firestore</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={fetchAllUsers}>Load All Users</Button>
                        {allUsers.length > 0 && (
                            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                                {JSON.stringify(allUsers, null, 2)}
                            </pre>
                        )}
                    </CardContent>
                </Card>

                {/* Diagnosis */}
                <Card>
                    <CardHeader>
                        <CardTitle>Diagnosis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="space-y-2">
                            <p className="font-semibold">Issue Check:</p>
                            {!firestoreUserDoc && (
                                <p className="text-red-600">
                                    ❌ No Firestore document exists for the Firebase Auth UID.
                                    <br />
                                    <strong>Solution:</strong> The user document ID in Firestore must match the Firebase Auth UID.
                                </p>
                            )}
                            {firestoreUserDoc && userByEmail && firestoreUserDoc.id !== userByEmail.id && (
                                <p className="text-yellow-600">
                                    ⚠ UID Mismatch: Firebase Auth UID ({firebaseAuthUser?.uid}) doesn't match the Firestore document ID ({userByEmail.id}).
                                    <br />
                                    <strong>Solution:</strong> Create a new Firestore document with ID = Firebase Auth UID, or use the correct UID.
                                </p>
                            )}
                            {firestoreUserDoc && (
                                <>
                                    <p className="text-green-600">
                                        ✓ Firestore document found
                                    </p>
                                    <p>
                                        <strong>Role:</strong> {firestoreUserDoc.role}
                                        <br />
                                        <strong>Onboarding Completed:</strong> {String(firestoreUserDoc.onboardingCompleted)}
                                    </p>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
