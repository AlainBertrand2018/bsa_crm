
"use client";
import React from 'react';
import type { Invoice } from '@/lib/types';
import { VAT_RATE } from '@/lib/constants';
import { DocumentHeader } from '@/components/shared/DocumentHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generatePdfDocument } from '@/lib/pdfGenerator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { usersService } from '@/lib/firestore';
import type { BusinessDetails } from '@/lib/types';

interface InvoiceViewProps {
  invoice: Invoice;
}

export function InvoiceView({ invoice }: InvoiceViewProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [creatorBusiness, setCreatorBusiness] = React.useState<BusinessDetails | undefined>(undefined);

  React.useEffect(() => {
    const fetchCreatorBusiness = async () => {
      console.log('[InvoiceView] Fetching creator business details...');
      console.log('[InvoiceView] invoice.createdBy:', invoice.createdBy);
      console.log('[InvoiceView] currentUser?.id:', currentUser?.id);
      console.log('[InvoiceView] currentUser?.businessDetails:', currentUser?.businessDetails);

      // If the current user is the creator, we might already have the data in context
      if (currentUser?.id === invoice.createdBy && currentUser.businessDetails) {
        console.log('[InvoiceView] Using current user business details');
        setCreatorBusiness(currentUser.businessDetails);
        return;
      }

      // If no createdBy field, use current user's business details as fallback
      if (!invoice.createdBy) {
        console.warn('[InvoiceView] No createdBy field found in invoice, using current user business details');
        setCreatorBusiness(currentUser?.businessDetails);
        return;
      }

      try {
        console.log('[InvoiceView] Fetching creator document from Firestore...');
        const creatorDoc: any = await usersService.getById(invoice.createdBy);
        console.log('[InvoiceView] Creator document:', creatorDoc);

        if (creatorDoc?.businessDetails) {
          console.log('[InvoiceView] Found creator business details:', creatorDoc.businessDetails);
          setCreatorBusiness(creatorDoc.businessDetails);
        } else {
          console.warn('[InvoiceView] Creator document has no businessDetails');
        }
      } catch (error) {
        console.error("[InvoiceView] Error fetching creator business details:", error);
      }
    };

    fetchCreatorBusiness();
  }, [invoice.createdBy, currentUser]);

  const handleDownloadPdf = () => {
    try {
      generatePdfDocument(invoice, 'Invoice', creatorBusiness);
      toast({
        title: "PDF Generated",
        description: `Invoice ${invoice.id}.pdf has been downloaded.`,
      });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({
        title: "Error Generating PDF",
        description: "There was an issue creating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    toast({
      title: "Print (Placeholder)",
      description: "This would trigger the browser's print dialog.",
    });
    // window.print(); 
  }

  const amountBeforeVat = Math.max(0, invoice.subTotal - (invoice.discount || 0));

  return (
    <Card className="shadow-xl w-full max-w-4xl mx-auto">
      <CardHeader className="bg-muted/30 p-6">
        <DocumentHeader businessDetails={creatorBusiness} />
        <div className="flex flex-col sm:flex-row justify-between items-start pt-4">
          <div>
            <CardTitle className="text-2xl font-bold text-primary mb-1">Invoice</CardTitle>
            <CardDescription>ID: {invoice.id}</CardDescription>
            {invoice.quotationId && <CardDescription>Ref Quotation: {invoice.quotationId}</CardDescription>}
          </div>
          <div className="text-sm text-right mt-2 sm:mt-0 space-y-1">
            <p><strong>Date Issued:</strong> {formatDate(invoice.invoiceDate)}</p>
            <p><strong>Due Date:</strong> {formatDate(invoice.dueDate)}</p>
            <div className="flex items-center justify-end"><strong>Status:</strong>
              <StatusBadge status={invoice.status} className="ml-2" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-1">Bill To:</h3>
          <p className="font-medium">{invoice.clientName}</p>
          {invoice.clientCompany && <p>{invoice.clientCompany}</p>}
          <p>Email: {invoice.clientEmail}</p>
          {invoice.clientPhone && <p>Phone: {invoice.clientPhone}</p>}
          {invoice.clientAddress && <p>Address: {invoice.clientAddress}</p>}
          {invoice.clientBRN && <p>BRN: {invoice.clientBRN}</p>}
        </div>

        <Table className="mb-6">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Item Description</TableHead>
              <TableHead className="text-center">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="font-medium">{item.description || "Unknown Item"}</span>
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.unitPrice, invoice.currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.total, invoice.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-end mb-6">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subTotal, invoice.currency)}</span>
            </div>
            {(invoice.discount || 0) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.discount!, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Amount before VAT:</span>
              <span>{formatCurrency(amountBeforeVat, invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT ({VAT_RATE * 100}%):</span>
              <span>{formatCurrency(invoice.vatAmount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 border-primary">
              <span>Grand Total:</span>
              <span>{formatCurrency(invoice.grandTotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-medium">
              <span>Total Paid:</span>
              <span>{formatCurrency(invoice.totalPaid || 0, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-destructive font-bold border-t pt-1">
              <span>Balance Due:</span>
              <span>{formatCurrency(Math.max(0, invoice.grandTotal - (invoice.totalPaid || 0)), invoice.currency)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mb-6 p-4 bg-muted/50 rounded-md">
            <h4 className="font-semibold mb-1">Notes:</h4>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          Please make payment by {formatDate(invoice.dueDate)}. <br /> All prices are in {invoice.currency}.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPdf} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
