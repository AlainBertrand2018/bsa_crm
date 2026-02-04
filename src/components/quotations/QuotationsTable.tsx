
"use client";
import React from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit3, MoreHorizontal, CheckCircle, XCircle, Send as SendIcon, Mail, Info, Trash2, FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Quotation } from '@/lib/types';
import { QUOTATION_STATUSES, QuotationStatus, COMPANY_DETAILS, APP_NAME, STATUS_COLORS } from '@/lib/constants';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabaseService } from '@/lib/supabaseService';
// import { usersService } from '@/lib/firestore'; // Removed firestore dependency
import { generatePdfDocument } from '@/lib/pdfGenerator';
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
} from "@/components/ui/alert-dialog";

interface QuotationsTableProps {
  quotations: Quotation[];
  onUpdateStatus: (id: string, status: QuotationStatus) => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export function QuotationsTable({ quotations, onUpdateStatus, onDelete, isLoading }: QuotationsTableProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const [quotationToDelete, setQuotationToDelete] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  if (!isLoading && quotations.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No Quotations Found"
        description="You haven't created any quotations yet. Get started by creating a new one."
        actionText="Create New Quotation"
        actionHref="/quotations/new"
      />
    );
  }

  const handleSendQuotationPdf = async (quotationId: string, clientEmail: string | undefined, clientName: string) => {
    if (!clientEmail) {
      toast({
        title: "Cannot Prepare Email",
        description: `Client email is missing for quotation ${quotationId}. Please edit the quotation to add an email address.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await supabaseService.quotations.getById(quotationId);
      if (!data) {
        toast({
          title: "Error",
          description: `Quotation ${quotationId} not found.`,
          variant: "destructive",
        });
        return;
      }

      let businessDetails = currentUser?.businessDetails;
      // If the current user is not the creator, fetch the creator's business details from Supabase
      if (currentUser?.id !== data.user_id && data.user_id) {
        try {
          const profile: any = await supabaseService.profiles.get(data.user_id);
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

      const quotation: Quotation = {
        ...data,
        clientName: data.clients?.client_name || data.clientName,
        clientEmail: data.clients?.client_email || data.clientEmail,
        clientCompany: data.clients?.client_company || data.clientCompany,
        expiryDate: data.expiry_date || data.expiryDate,
        quotationDate: data.quotation_date || data.quotationDate,
        subTotal: data.sub_total || data.subTotal,
        vatAmount: data.vat_amount || data.vatAmount,
        grandTotal: data.grand_total || data.grandTotal,
        createdBy: data.user_id || data.createdBy,
        clientId: data.client_id || data.clientId
      };

      generatePdfDocument(quotation, 'Quotation', businessDetails);
      toast({
        title: "PDF Downloading",
        description: `Quotation ${quotation.id}.pdf is downloading. Please attach it to the email.`,
        duration: 7000,
      });

      const businessName = businessDetails?.businessName || COMPANY_DETAILS.name;
      const businessEmail = businessDetails?.email || COMPANY_DETAILS.email;
      const subject = encodeURIComponent(`Quotation ${quotation.id} from ${businessName}`);
      const body = encodeURIComponent(
        `Dear ${clientName},

Please find our quotation ${quotation.id} attached.

If the PDF did not download automatically, please check your browser's downloads.

We look forward to hearing from you.

Best regards,
The Team at ${businessName}
(via ${APP_NAME} - ${businessEmail})`
      );

      window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`;

    } catch (error) {
      console.error("Error preparing quotation email:", error);
      toast({
        title: "Error",
        description: "Could not prepare the email for the quotation.",
        variant: "destructive",
      });
    }
  };

  // Removed getStatusBadgeVariant - using StatusBadge instead

  const handleDeleteQuotation = async () => {
    if (!quotationToDelete) return;

    if (currentUser?.role === 'User') {
      toast({
        title: "Permission Denied",
        description: "Regular users cannot delete quotations.",
        variant: "destructive",
      });
      return;
    }

    try {
      await supabaseService.quotations.delete(quotationToDelete);
      toast({
        title: "Quotation Deleted",
        description: `Quotation ${quotationToDelete} has been removed.`,
      });
      if (onDelete) onDelete();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast({
        title: "Error",
        description: "Failed to delete quotation.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };


  return (
    <div className="rounded-lg border overflow-hidden bg-card shadow-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={`loading-${i}`}>
              <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24"></div></TableCell>
              <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
              <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
              <TableCell className="text-right"><div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto"></div></TableCell>
              <TableCell><div className="h-6 bg-muted rounded animate-pulse w-20"></div></TableCell>
              <TableCell className="text-center"><div className="h-8 bg-muted rounded animate-pulse w-8 mx-auto"></div></TableCell>
            </TableRow>
          ))}
          {!isLoading && quotations.map((quotation) => (
            <TableRow key={quotation.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium">
                <Link href={`/quotations/${quotation.id}`} className="hover:underline text-primary">
                  {quotation.id}
                </Link>
              </TableCell>
              <TableCell>{quotation.clientName} {quotation.clientCompany && `(${quotation.clientCompany})`}</TableCell>
              <TableCell>{formatDate(quotation.quotationDate)}</TableCell>
              <TableCell className="text-right">{formatCurrency(quotation.grandTotal, quotation.currency)}</TableCell>
              <TableCell>
                <StatusBadge status={quotation.status} />
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={`/quotations/${quotation.id}`} className="flex items-center">
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendQuotationPdf(quotation.id, quotation.clientEmail, quotation.clientName)}>
                      <Mail className="mr-2 h-4 w-4" /> Send PDF
                    </DropdownMenuItem>

                    {/* Deletion logic: Only Super Admin can delete */}
                    {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && (
                      <>
                        <DropdownMenuItem asChild>
                          {/* Ownership check for User role (though Admin/SuperAdmin can edit all) */}
                          {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || quotation.createdBy === currentUser?.id) ? (
                            <Link href={`/quotations/${quotation.id}/edit`} className="flex items-center">
                              <Edit3 className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          ) : (
                            <div className="flex items-center opacity-50 cursor-not-allowed px-2 py-1.5 text-sm">
                              <Edit3 className="mr-2 h-4 w-4" /> Edit (Owner only)
                            </div>
                          )}
                        </DropdownMenuItem>

                        {(isSuperAdmin || currentUser?.role === 'Admin') && (
                          <DropdownMenuItem
                            onClick={() => {
                              setQuotationToDelete(quotation.id);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </>
                    )}

                    {/* For Users: they can only edit if they are the owner */}
                    {currentUser?.role === 'User' && (
                      <DropdownMenuItem asChild disabled={quotation.createdBy !== currentUser?.id}>
                        {quotation.createdBy === currentUser?.id ? (
                          <Link href={`/quotations/${quotation.id}/edit`} className="flex items-center">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        ) : (
                          <div className="flex items-center opacity-50 cursor-not-allowed px-2 py-1.5 text-sm">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit (Owner only)
                          </div>
                        )}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    {QUOTATION_STATUSES.map(status => {
                      const canChangeStatus = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || quotation.createdBy === currentUser?.id;
                      return (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => onUpdateStatus(quotation.id, status)}
                          disabled={quotation.status === status || !canChangeStatus}
                          className="capitalize"
                        >
                          {status === 'To Send' && <Info className="mr-2 h-4 w-4" />}
                          {status === 'Sent' && <SendIcon className="mr-2 h-4 w-4" />}
                          {status === 'Won' && <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
                          {status === 'Lost' && <XCircle className="mr-2 h-4 w-4 text-red-500" />}
                          Mark as {status} {!canChangeStatus && "(Owner only)"}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete quotation
              <span className="font-mono font-bold mx-1">{quotationToDelete}</span>
              from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuotationToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuotation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
