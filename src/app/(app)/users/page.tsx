
"use client";

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { usersService } from '@/lib/firestore';
import { User } from '@/lib/types';
import { UserPlus, Eye, Mail, User as UserIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function UsersPage() {
    const { currentUser, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const data = await usersService.getAll(currentUser?.companyId, currentUser?.role);
            setUsers(data as User[]);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && currentUser) {
            if (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin') {
                router.push('/dashboard');
                return;
            }
        }
    }, [currentUser, authLoading, router]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = async (userId: string) => {
        if (currentUser?.role !== 'Super Admin') {
            toast({
                title: "Permission Denied",
                description: "Only Super Admins can delete users.",
                variant: "destructive",
            });
            return;
        }

        if (userId === currentUser.id) {
            toast({
                title: "Invalid Operation",
                description: "You cannot delete your own account from here.",
                variant: "destructive",
            });
            return;
        }

        try {
            await usersService.delete(userId);
            toast({
                title: "User Deleted",
                description: "The user has been removed from the system.",
            });
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({
                title: "Error",
                description: "Failed to delete user.",
                variant: "destructive",
            });
        }
    };

    if (isLoading) {
        return <FullPageLoading message="Loading users..." />;
    }

    return (
        <>
            <PageHeader
                title="User Management"
                description="Monitor and manage system users and their profiles."
                actions={
                    currentUser?.role === 'Super Admin' && (
                        <Link href="/users/new">
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                <UserPlus className="mr-2 h-4 w-4" /> Add New User
                            </Button>
                        </Link>
                    )
                }
            />

            <Card className="shadow-xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Business</TableHead>
                                <TableHead>Onboarding</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <UserIcon className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="font-medium">{user.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                <span>{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === 'Super Admin' ? 'default' : user.role === 'Admin' ? 'secondary' : 'outline'}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium">{user.businessName || 'N/A'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.onboardingCompleted ? 'success' as any : 'warning' as any}>
                                                {user.onboardingCompleted ? 'Completed' : 'Pending'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/profile/${user.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="mr-2 h-4 w-4" /> View Profile
                                                    </Button>
                                                </Link>
                                                {currentUser?.role === 'Super Admin' && user.id !== currentUser?.id && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the user
                                                                    "{user.name}" and all their associated system records.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Delete User
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
