"use client";

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function ClearAuthPage() {
    const [status, setStatus] = useState<string>('');
    const router = useRouter();

    const clearAuth = async () => {
        setStatus('Clearing authentication...');

        try {
            // 1. Sign out from Firebase
            await signOut(auth);
            setStatus('Signed out from Firebase ✓');

            // 2. Clear all localStorage
            localStorage.clear();
            setStatus('Cleared localStorage ✓');

            // 3. Clear sessionStorage
            sessionStorage.clear();
            setStatus('Cleared sessionStorage ✓');

            // 4. Clear IndexedDB (Firebase uses this)
            if (window.indexedDB) {
                const dbs = await window.indexedDB.databases();
                dbs.forEach((db) => {
                    if (db.name) {
                        window.indexedDB.deleteDatabase(db.name);
                    }
                });
                setStatus('Cleared IndexedDB ✓');
            }

            setStatus('All authentication data cleared! Redirecting to login...');

            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (error: any) {
            setStatus(`Error: ${error.message}`);
        }
    };

    useEffect(() => {
        // Auto-clear on mount
        clearAuth();
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Clearing Authentication</CardTitle>
                    <CardDescription>
                        Removing all stored authentication data...
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted p-4 rounded-md">
                        <p className="text-sm font-mono">{status}</p>
                    </div>
                    <Button onClick={clearAuth} className="w-full">
                        Clear Again
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
