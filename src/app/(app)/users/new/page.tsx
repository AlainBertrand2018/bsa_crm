
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { secondaryAuth } from '@/lib/firebase-admin';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function NewUserPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'User'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleChange = (value: string) => {
        setFormData({ ...formData, role: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) {
            toast({
                title: "Error",
                description: "Please fill in all fields.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Create user in Firebase Auth using the secondary instance
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                formData.email,
                formData.password
            );
            const newUser = userCredential.user;

            // 2. Set display name (optional but good practice)
            await updateProfile(newUser, { displayName: formData.name });

            // Determine onboardingCompleted based on role
            // Super Admin and Admin don't need onboarding, regular Users do
            const onboardingCompleted = formData.role === 'Super Admin' || formData.role === 'Admin';

            // 3. Create document in Firestore 'users' collection
            await setDoc(doc(db, 'users', newUser.uid), {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                onboardingCompleted: onboardingCompleted,
                companyId: currentUser?.companyId,
                createdAt: serverTimestamp(),
            });

            // 4. Important: Sign out the new user from the secondary instance immediately
            // to avoid any potential session conflicts, though secondary app sessions are separate.
            await signOut(secondaryAuth);

            toast({
                title: "Success",
                description: `Account for ${formData.name} has been created successfully.`,
            });

            router.push('/users');
        } catch (error: any) {
            console.error("Error creating user:", error);
            toast({
                title: "Creation Failed",
                description: error.message || "An error occurred while creating the user.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Add New User"
                description="Register a new team member or administrator."
                actions={
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                }
            />

            <div className="max-w-2xl mx-auto">
                <Card className="shadow-2xl">
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">User Role</Label>
                                <Select value={formData.role} onValueChange={handleRoleChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="User">User (Standard)</SelectItem>
                                        <SelectItem value="Admin">Admin (Manager)</SelectItem>
                                        {currentUser?.role === 'Super Admin' && (
                                            <SelectItem value="Super Admin">Super Admin (Full Control)</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground pt-1">
                                    Admins and Super Admins have higher level access to quotations and business data.
                                </p>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full h-12 text-lg font-bold"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="mr-2 h-5 w-5" />
                                            Create User Account
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
