
"use client";
import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Users,
    Wrench,
    Trash2,
    Activity,
    Database,
    ShieldAlert,
    RefreshCcw,
    Settings,
    FileSearch,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';

export default function AdministrativeToolsPage() {
    const { currentUser, isLoading } = useAuth();
    const router = useRouter();

    // Role-based access control
    useEffect(() => {
        if (!isLoading && currentUser) {
            if (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin') {
                router.replace('/dashboard');
            }
        }
    }, [currentUser, isLoading, router]);

    if (isLoading) return <FullPageLoading message="Verifying permissions..." />;
    if (!currentUser || (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin')) {
        return null;
    }

    const adminTools = [
        {
            title: "User Setup",
            description: "Initialize and synchronize Firebase Auth users with Firestore records.",
            href: "/setup-users",
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Fix UID",
            description: "Repair broken links between Firebase Auth and Firestore document IDs.",
            href: "/fix-user-uid",
            icon: RefreshCcw,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            title: "Clear Auth",
            description: "Deep-clean local authentication state, sessions, and IndexedDB cache.",
            href: "/clear-auth",
            icon: Trash2,
            color: "text-red-500",
            bg: "bg-red-500/10"
        },
        {
            title: "Diagnostics",
            description: "Comprehensive system scan for UID mismatches and authentication health.",
            href: "/auth-diagnostics",
            icon: Activity,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            title: "Test Connection",
            description: "Verify Firestore latency and collection accessibility in real-time.",
            href: "/test-connection",
            icon: Database,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        }
    ];

    const suggestedTools = [
        {
            title: "Role Manager",
            description: "Manage user permissions and switch roles without database console access.",
            icon: ShieldAlert,
            comingSoon: true
        },
        {
            title: "System Logs",
            description: "View real-time application events, user logins, and critical errors.",
            icon: FileSearch,
            comingSoon: true
        },
        {
            title: "Global Settings",
            description: "Manage app branding, contact info, and server-side configuration.",
            icon: Settings,
            comingSoon: true
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="Administrative Tools"
                description="Core system utilities for managing user authentication, database integrity, and system health."
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {adminTools.map((tool) => (
                    <Link key={tool.href} href={tool.href} className="group">
                        <Card className="h-full border-primary/5 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className={`p-3 rounded-xl ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform duration-300`}>
                                    <tool.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">{tool.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-sm leading-relaxed">
                                    {tool.description}
                                </CardDescription>
                                <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open Tool <Wrench className="ml-2 w-3 h-3" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="mt-12">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-primary" />
                    Suggested Future Enhancements
                </h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {suggestedTools.map((tool) => (
                        <Card key={tool.title} className="opacity-75 border-dashed">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="p-3 rounded-xl bg-muted">
                                    <tool.icon className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl text-muted-foreground">{tool.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    {tool.description}
                                </CardDescription>
                                <Badge variant="outline" className="mt-4">Proposed Feature</Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variant === 'outline' ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' : ''} ${className}`}>
            {children}
        </span>
    );
}
