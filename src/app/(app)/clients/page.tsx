"use client";
import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabaseService } from '@/lib/supabaseService';
import { ClientDetails } from '@/lib/types';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Plus, Mail, Phone, Building2, User, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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

export default function ClientsPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [clients, setClients] = useState<ClientDetails[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchClients = async () => {
        if (!currentUser) return;
        try {
            const data = await supabaseService.clients.getAll(currentUser.id, currentUser.role, currentUser.companyId);
            const transformedData = data.map((c: any) => ({
                ...c,
                clientName: c.client_name || c.clientName,
                clientEmail: c.client_email || c.clientEmail,
                clientCompany: c.client_company || c.clientCompany,
                clientPhone: c.client_phone || c.clientPhone,
                clientAddress: c.client_address || c.clientAddress,
                clientBRN: c.client_brn || c.clientBRN,
            }));
            setClients(transformedData as ClientDetails[]);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (clientId: string) => {
        if (currentUser?.role !== 'Super Admin') {
            toast({
                title: "Permission Denied",
                description: "Only Super Admins can delete data.",
                variant: "destructive",
            });
            return;
        }

        try {
            await supabaseService.clients.delete(clientId);
            toast({
                title: "Client Deleted",
                description: "The client record has been removed from the system.",
            });
            fetchClients();
        } catch (error) {
            console.error("Error deleting client:", error);
            toast({
                title: "Error",
                description: "Failed to delete client record.",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        fetchClients();
    }, [currentUser]);

    if (loading) return <FullPageLoading message="Loading clients..." />;

    return (
        <>
            <PageHeader
                title="Clients"
                description="Manage your client database."
                actions={
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Client
                    </Button>
                }
            />
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client Name</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>BRN</TableHead>
                                {currentUser?.role === 'Super Admin' && (
                                    <TableHead className="text-right">Actions</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                        No clients found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="font-medium">{client.clientName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {client.clientCompany && (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                                    <span>{client.clientCompany}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">{client.clientEmail}</span>
                                                </div>
                                                {client.clientPhone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-sm">{client.clientPhone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{client.clientBRN || '-'}</TableCell>
                                        {currentUser?.role === 'Super Admin' && (
                                            <TableCell className="text-right">
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
                                                                This action cannot be undone. This will permanently delete the client
                                                                "{client.clientName}" and all associated data records from the database.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(client.id!)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        )}
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
