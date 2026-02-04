
"use client";
import React from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal, Send, CreditCard, Mail, Trash2 } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { INVOICE_STATUSES, InvoiceStatus, COMPANY_DETAILS, APP_NAME } from '@/lib/constants';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabaseService } from '@/lib/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { generatePdfDocument } from '@/lib/pdfGenerator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { receiptsService } from '@/lib/firestore';


interface InvoicesTableProps {
  invoices: Invoice[];
  onUpdateStatus?: (id: string, status: InvoiceStatus) => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export function InvoicesTable({ invoices, onUpdateStatus, onDelete, isLoading }: InvoicesTableProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Payment state
  const [paymentInvoice, setPaymentInvoice] = React.useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] = React.useState<string>("Bank Transfer");
  const [isPaymentLoading, setIsPaymentLoading] = React.useState(false);

  if (!isLoading && invoices.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No Invoices Found"
        description="There are no invoices to display. Invoices are typically generated when quotations are marked as 'Won'."
        actionText="View Quotations"
        actionHref="/quotations"
      />
    );
  }

  const handleSendInvoicePdf = async (invoiceId: string, clientEmail: string | undefined, clientName: string) => {
    if (!clientEmail) {
      toast({
        title: "Cannot Prepare Email",
        description: `Client email is missing for invoice ${invoiceId}. Please check the original quotation or client details.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await supabaseService.invoices.getById(invoiceId);
      if (!data) {
        toast({
          title: "Error",
          description: `Invoice ${invoiceId} not found.`,
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

      const invoice: Invoice = {
        ...data,
        clientName: data.clients?.client_name || data.clientName,
        clientEmail: data.clients?.client_email || data.clientEmail,
        clientCompany: data.clients?.client_company || data.clientCompany,
        invoiceDate: data.invoice_date || data.invoiceDate,
        dueDate: data.due_date || data.dueDate,
        subTotal: data.sub_total || data.subTotal,
        vatAmount: data.vat_amount || data.vatAmount,
        grandTotal: data.grand_total || data.grandTotal,
        totalPaid: data.total_paid || data.totalPaid,
        createdBy: data.user_id || data.createdBy,
        clientId: data.client_id || data.clientId
      };

      generatePdfDocument(invoice, 'Invoice', businessDetails);
      toast({
        title: "PDF Downloading",
        description: `Invoice ${invoice.id}.pdf is downloading. Please attach it to the email.`,
        duration: 7000,
      });

      const businessName = businessDetails?.businessName || COMPANY_DETAILS.name;
      const subject = encodeURIComponent(`Invoice ${invoice.id} from ${businessName}`);
      const body = encodeURIComponent(
        `Dear ${clientName},

Please find your invoice ${invoice.id} attached.

If the PDF did not download automatically, please check your browser's downloads.

Thank you for your business.

Sincerely,
The Team at ${businessName}
(via ${APP_NAME})`
      );

      window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`;

    } catch (error) {
      console.error("Error preparing invoice email:", error);
      toast({
        title: "Error",
        description: "Could not prepare the email for the invoice.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    if (currentUser?.role === 'User') {
      toast({
        title: "Permission Denied",
        description: "Regular users cannot delete invoices.",
        variant: "destructive",
      });
      return;
    }

    try {
      await supabaseService.invoices.delete(invoiceToDelete);
      toast({
        title: "Invoice Deleted",
        description: `Invoice ${invoiceToDelete} has been removed.`,
      });
      if (onDelete) onDelete();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete invoice.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleRegisterPayment = async () => {
    if (!paymentInvoice || !paymentAmount) return;

    setIsPaymentLoading(true);
    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive" });
        return;
      }

      await supabaseService.receipts.create({
        invoice_id: paymentInvoice.id,
        amount: amount,
        payment_method: paymentMethod,
        date: new Date().toISOString(),
        client_name: paymentInvoice.clientName,
        client_company: paymentInvoice.clientCompany,
        client_email: paymentInvoice.clientEmail,
        client_phone: paymentInvoice.clientPhone,
        client_address: paymentInvoice.clientAddress,
        client_brn: paymentInvoice.clientBRN,
        user_id: currentUser?.id,
        companyId: currentUser?.companyId,
      });

      toast({
        title: "Payment Registered",
        description: `Receipt generated for ${formatCurrency(amount, paymentInvoice.currency)}. Invoice status will update automatically.`,
      });

      setPaymentInvoice(null);
      setPaymentAmount("");
      if (onDelete) onDelete(); // Refresh list
    } catch (error) {
      console.error("Error registering payment:", error);
      toast({ title: "Error", description: "Failed to register payment.", variant: "destructive" });
    } finally {
      setIsPaymentLoading(false);
    }
  };

  return (
    <div className="rounded-lg border overflow-hidden bg-card shadow-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Balance</TableHead>
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
              <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
              <TableCell className="text-right"><div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto"></div></TableCell>
              <TableCell><div className="h-6 bg-muted rounded animate-pulse w-20"></div></TableCell>
              <TableCell className="text-center"><div className="h-8 bg-muted rounded animate-pulse w-8 mx-auto"></div></TableCell>
            </TableRow>
          ))}
          {!isLoading && invoices.map((invoice) => (
            <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium">
                <Link href={`/invoices/${invoice.id}`} className="hover:underline text-primary">
                  {invoice.id}
                </Link>
              </TableCell>
              <TableCell>{invoice.clientName} {invoice.clientCompany && `(${invoice.clientCompany})`}</TableCell>
              <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
              <TableCell>{formatDate(invoice.dueDate)}</TableCell>
              <TableCell className="text-right">{formatCurrency(invoice.grandTotal, invoice.currency)}</TableCell>
              <TableCell className="text-right text-green-600 font-medium">{formatCurrency(invoice.totalPaid || 0, invoice.currency)}</TableCell>
              <TableCell className="text-right text-destructive">{formatCurrency(Math.max(0, invoice.grandTotal - (invoice.totalPaid || 0)), invoice.currency)}</TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} />
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
                      <Link href={`/invoices/${invoice.id}`} className="flex items-center">
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendInvoicePdf(invoice.id, invoice.clientEmail, invoice.clientName)}>
                      <Mail className="mr-2 h-4 w-4" /> Send PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setPaymentInvoice(invoice);
                        setPaymentAmount(Math.max(0, invoice.grandTotal - (invoice.totalPaid || 0)).toString());
                      }}
                      className="text-primary"
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Register Payment
                    </DropdownMenuItem>

                    {(isSuperAdmin || currentUser?.role === 'Admin') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setInvoiceToDelete(invoice.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive-foreground focus:bg-destructive/90"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
                        </DropdownMenuItem>
                      </>
                    )}
                    {onUpdateStatus && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        {INVOICE_STATUSES.map(status => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => onUpdateStatus(invoice.id, status)}
                            disabled={invoice.status === status}
                            className="capitalize"
                          >
                            {status === 'Fully Paid' && <CreditCard className="mr-2 h-4 w-4 text-green-500" />}
                            {status === 'To Send' && <Mail className="mr-2 h-4 w-4" />}
                            {status === 'Partly Paid' && <CreditCard className="mr-2 h-4 w-4 text-sky-500" />}
                            {status === 'Sent' && <Send className="mr-2 h-4 w-4 text-orange-500" />}
                            Mark as {status}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
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
              This action cannot be undone. This will permanently delete invoice
              <span className="font-mono font-bold mx-1">{invoiceToDelete}</span>
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Register Payment Dialog */}
      <Dialog open={!!paymentInvoice} onOpenChange={(open) => !open && setPaymentInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Payment</DialogTitle>
            <DialogDescription>
              Enter the payment details for invoice {paymentInvoice?.id}.
              This will generate an official receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">Method</Label>
              <Select onValueChange={setPaymentMethod} defaultValue={paymentMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentInvoice(null)}>Cancel</Button>
            <Button
              onClick={handleRegisterPayment}
              disabled={isPaymentLoading || !paymentAmount}
              className="bg-primary"
            >
              {isPaymentLoading ? "Processing..." : "Register Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
