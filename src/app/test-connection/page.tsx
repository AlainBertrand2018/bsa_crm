
"use client";

import React, { useEffect, useState } from 'react';
import { usersService, clientsService, quotationsService, invoicesService } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TestConnectionPage() {
    const { currentUser, isLoading } = useAuth();
    const router = useRouter();
    const [results, setResults] = useState<any[]>([]);

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

    const checkCollection = async (name: string, fn: () => Promise<any[]>) => {
        try {
            const start = Date.now();
            const docs = await fn();
            const duration = Date.now() - start;
            return { name, status: 'SUCCESS', count: docs.length, duration, error: null };
        } catch (error: any) {
            return { name, status: 'ERROR', count: 0, duration: 0, error: error.message };
        }
    };

    useEffect(() => {
        const runTests = async () => {
            const tests = [
                checkCollection('Users', () => usersService.getAll()),
                checkCollection('Clients', () => clientsService.getAll()),
                checkCollection('Quotations', () => quotationsService.getAll()),
                checkCollection('Invoices', () => invoicesService.getAll()),
            ];

            const results = await Promise.all(tests);
            setResults(results);
        };

        runTests();
    }, []);

    return (
        <div className="container mx-auto p-8">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.push('/tools')} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Admin Tools
                </Button>
            </div>
            <h1 className="text-2xl font-bold mb-6">Firebase Connection Diagnostics</h1>
            <div className="grid gap-4">
                {results.map((res) => (
                    <Card key={res.name} className={res.status === 'SUCCESS' ? 'border-green-500' : 'border-red-500'}>
                        <CardHeader>
                            <CardTitle className={res.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                                {res.name}: {res.status}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {res.status === 'SUCCESS' ? (
                                <p>Successfully fetched {res.count} documents in {res.duration}ms.</p>
                            ) : (
                                <p className="text-red-500 font-mono text-sm">{res.error}</p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
