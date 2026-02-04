"use client";
import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { receiptsService } from '@/lib/firestore'; // Keeping for businesses fallback
import { supabaseService } from '@/lib/supabaseService';
// import { usersService } from '@/lib/firestore'; // Removed firestore
import { Receipt, BusinessDetails } from '@/lib/types';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Receipt as ReceiptIcon, CreditCard, Trash2, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { generateReceiptPdf } from '@/lib/pdfGenerator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RECEIPT_STATUSES, ReceiptStatus } from '@/lib/constants';
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

export default function ReceiptsPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReceipts = async () => {
        if (!currentUser) return;
        try {
            const data = await supabaseService.receipts.getAll(currentUser.id, currentUser.role, currentUser.companyId);

            const transformedData = data.map((r: any) => ({
                ...r,
                clientName: r.client_name || r.clientName,
                clientCompany: r.client_company || r.clientCompany,
                paymentMethod: r.payment_method || r.paymentMethod,
                createdBy: r.user_id || r.createdBy
            }));

            setReceipts(transformedData as Receipt[]);
        } catch (error) {
            console.error("Error fetching receipts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceipts();
    }, [currentUser]);

    const handleDelete = async (receiptId: string) => {
        if (currentUser?.role !== 'Super Admin') {
            toast({
                title: "Permission Denied",
                description: "Only Super Admins can delete data.",
                variant: "destructive",
            });
            return;
        }

        try {
            await supabaseService.receipts.delete(receiptId);
            toast({
                title: "Receipt Deleted",
                description: "The receipt has been removed from the system.",
            });
            fetchReceipts();
        } catch (error) {
            console.error("Error deleting receipt:", error);
            toast({
                title: "Error",
                description: "Failed to delete receipt.",
                variant: "destructive",
            });
        }
    };

    const handleDownloadPdf = async (receipt: Receipt) => {
        try {
            let businessDetails = currentUser?.businessDetails;

            // If the current user is not the creator, fetch the creator's business details from Supabase
            if (currentUser?.id !== receipt.createdBy && receipt.createdBy) {
                try {
                    const profile: any = await supabaseService.profiles.get(receipt.createdBy);
                    if (profile) {
                        businessDetails = {
                            businessName: profile.business_name,
                            businessAddress: profile.business_address,
                            brn: profile.brn,
                            vatNo: profile.vat_no,
                            telephone: profile.telephone,
                            website: profile.website,
                            email: profile.email || '',
                            position: profile.role || ''
                        };
                    }
                } catch (e) {
                    console.error("Error fetching creator profile:", e);
                }
            }

            generateReceiptPdf(receipt, businessDetails);
            toast({
                title: "PDF Generated",
                description: `Receipt for ${receipt.clientName} has been downloaded.`,
            });
        } catch (error) {
            console.error("Error generating receipt PDF:", error);
            toast({
                title: "Error",
                description: "Failed to generate PDF.",
                variant: "destructive",
            });
        }
    };

    if (loading) return <FullPageLoading message="Loading receipts..." />;

    return (
        <>
            <PageHeader
                title="Receipts"
                description="View and manage transaction receipts."
            />
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Receipt ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Payment Method</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {receipts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        No receipts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                receipts.map((receipt) => (
                                    <TableRow key={receipt.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <ReceiptIcon className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="font-mono text-sm">{receipt.id.slice(0, 8)}...</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(receipt.date)}</TableCell>
                                        <TableCell className="font-medium">{receipt.clientName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-3 w-3 text-muted-foreground" />
                                                <span>{receipt.paymentMethod}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(receipt.amount)}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={receipt.status || 'Sent'} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDownloadPdf(receipt)}
                                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                {currentUser?.role === 'Super Admin' && (
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
                                                                    This action cannot be undone. This will permanently delete the receipt
                                                                    record from the database.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(receipt.id)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Delete
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
