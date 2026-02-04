
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2, Rocket } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

const loginFormSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }).min(1, "Email is required."),
    password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LoginModal({ isOpen, onOpenChange }: LoginModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, currentUser, logout } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const handleContinue = () => {
        onOpenChange(false);
        router.push('/dashboard');
    };

    const handleSwitchAccount = async () => {
        await logout();
        // form will be shown after logout
    };

    async function onSubmit(data: LoginFormValues) {
        setIsSubmitting(true);
        try {
            const result = await login(data.email, data.password);
            if (result.success) {
                toast({
                    title: "Login Successful",
                    description: "Welcome back!",
                });
                onOpenChange(false);
                // Navigation will be handled by the layout redirection logic
                router.push('/dashboard');
            } else {
                toast({
                    title: "Login Failed",
                    description: result.error || "Invalid email or password. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Login error:", error);
            toast({
                title: "Login Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border-primary/20 shadow-2xl">
                <DialogHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-12 w-12 text-primary"
                            aria-label={`${APP_NAME} Logo`}
                        >
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <DialogTitle className="text-2xl font-bold text-primary">{APP_NAME} Login</DialogTitle>
                    <DialogDescription>
                        {currentUser
                            ? `You are currently logged in as ${currentUser.name} (${currentUser.role}).`
                            : "Enter your credentials to access your dashboard."
                        }
                    </DialogDescription>
                </DialogHeader>

                {currentUser ? (
                    <div className="space-y-4 pt-4">
                        <Button onClick={handleContinue} className="w-full h-12 text-lg font-bold">
                            Continue to Dashboard
                            <Rocket className="ml-2 h-5 w-5" />
                        </Button>
                        <Button variant="outline" onClick={handleSwitchAccount} className="w-full h-12 text-muted-foreground">
                            Sign in as another user
                        </Button>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="you@example.com" {...field} className="bg-background/50" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} className="bg-background/50" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <LogIn className="mr-2 h-5 w-5" />
                                )}
                                {isSubmitting ? 'Signing In...' : 'Sign In'}
                            </Button>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
