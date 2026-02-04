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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const clientSchema = z.object({
    clientName: z.string().min(2, "Name must be at least 2 characters"),
    clientEmail: z.string().email("Invalid email address"),
    clientCompany: z.string().optional(),
    clientPhone: z.string().optional(),
    clientAddress: z.string().optional(),
    clientBRN: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientsPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [clients, setClients] = useState<ClientDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            clientName: '',
            clientEmail: '',
            clientCompany: '',
            clientPhone: '',
            clientAddress: '',
            clientBRN: '',
        }
    });

    const onSubmit = async (data: ClientFormValues) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            await supabaseService.clients.create({
                ...data,
                user_id: currentUser.id,
                companyId: currentUser.companyId,
            });
            toast({
                title: "Client Created",
                description: "The client record has been successfully added.",
            });
            setIsCreateModalOpen(false);
            form.reset();
            fetchClients();
        } catch (error) {
            console.error("Error creating client:", error);
            toast({
                title: "Error",
                description: "Failed to create client record.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Client
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Add New Client</DialogTitle>
                                <DialogDescription>
                                    Enter the details of the new client here. Click save when you're done.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                    <FormField
                                        control={form.control}
                                        name="clientName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Client Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="clientEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="john@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="clientCompany"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Company (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Acme Inc." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="clientPhone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="+230 ..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="clientBRN"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>BRN (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="C12345678" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="clientAddress"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="123 Main St, Port Louis" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter className="pt-4">
                                        <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? "Saving..." : "Save Client"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
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
