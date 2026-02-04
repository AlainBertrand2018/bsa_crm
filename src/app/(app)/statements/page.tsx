"use client";
import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statementsService } from '@/lib/firestore'; // Keeping for fallback
import { supabaseService } from '@/lib/supabaseService';
// import { usersService } from '@/lib/firestore'; // Removed firestore
import { Statement, BusinessDetails } from '@/lib/types';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, ScrollText, Calendar, Trash2, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { generateStatementPdf } from '@/lib/pdfGenerator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { STATEMENT_STATUSES, StatementStatus } from '@/lib/constants';
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

export default function StatementsPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [statements, setStatements] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchStatements = async () => {
        if (!currentUser) return;
        try {
            const data = await supabaseService.statements.getAll(currentUser.id, currentUser.role, currentUser.companyId);

            const transformedData = data.map((s: any) => ({
                ...s,
                clientName: s.clients?.client_name || s.clientName,
                createdBy: s.user_id || s.createdBy
            }));

            setStatements(transformedData as Statement[]);
        } catch (error) {
            console.error("Error fetching statements:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatements();
    }, [currentUser]);

    const handleDelete = async (statementId: string) => {
        if (currentUser?.role === 'User') {
            toast({
                title: "Permission Denied",
                description: "Regular users cannot delete statements.",
                variant: "destructive",
            });
            return;
        }

        try {
            await supabaseService.statements.delete(statementId);
            toast({
                title: "Statement Deleted",
                description: "The statement has been removed from the system.",
            });
            fetchStatements();
        } catch (error) {
            console.error("Error deleting statement:", error);
            toast({
                title: "Error",
                description: "Failed to delete statement.",
                variant: "destructive",
            });
        }
    };

    const handleUpdateStatus = async (id: string, status: StatementStatus) => {
        try {
            await supabaseService.statements.update(id, { status });
            setStatements(prev => prev.map(s => s.id === id ? { ...s, status } : s));
            toast({ title: "Status Updated", description: `Statement marked as ${status}.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
        }
    };

    const handleGenerateOverdue = async () => {
        setIsGenerating(true);
        try {
            await supabaseService.statements.generateOverdue();
            toast({
                title: "Statements Generated",
                description: "Overdue statements have been generated for all eligible invoices.",
            });
            fetchStatements();
        } catch (error) {
            console.error("Error generating statements:", error);
            toast({
                title: "Error",
                description: "Failed to generate statements automatically.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPdf = async (statement: Statement) => {
        try {
            let businessDetails = currentUser?.businessDetails;

            // If the current user is not the creator, fetch the creator's business details from Supabase
            if (currentUser?.id !== statement.createdBy && statement.createdBy) {
                try {
                    const profile: any = await supabaseService.profiles.get(statement.createdBy);
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

            generateStatementPdf(statement, businessDetails);
            toast({
                title: "PDF Generated",
                description: `Statement for ${statement.clientName} has been downloaded.`,
            });
        } catch (error) {
            console.error("Error generating statement PDF:", error);
            toast({
                title: "Error",
                description: "Failed to generate PDF.",
                variant: "destructive",
            });
        }
    };

    if (loading) return <FullPageLoading message="Loading statements..." />;

    return (
        <>
            <PageHeader
                title="Statements"
                description="Generate and view account statements."
                actions={
                    <Button onClick={handleGenerateOverdue} disabled={isGenerating}>
                        <Plus className="mr-2 h-4 w-4" /> {isGenerating ? "Processing..." : "Generate Overdue Statements"}
                    </Button>
                }
            />
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Statement ID</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Generated Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Due</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {statements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        No statements found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                statements.map((statement) => (
                                    <TableRow key={statement.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <ScrollText className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="font-mono text-sm">{statement.id.slice(0, 8)}...</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{statement.clientName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                <span>{statement.period}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(statement.date)}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={statement.status} />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(statement.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDownloadPdf(statement)}
                                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                {currentUser?.role !== 'User' && (
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
                                                                    This action cannot be undone. This will permanently delete the statement
                                                                    record from the database.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(statement.id)}
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
