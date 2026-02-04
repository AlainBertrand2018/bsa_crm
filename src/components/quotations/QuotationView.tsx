
"use client";
import React from 'react';
import type { Quotation } from '@/lib/types';
import { VAT_RATE, QuotationStatus } from '@/lib/constants';
import { DocumentHeader } from '@/components/shared/DocumentHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generatePdfDocument } from '@/lib/pdfGenerator';
import { useAuth } from '@/context/AuthContext';
import { usersService } from '@/lib/firestore';
import type { BusinessDetails } from '@/lib/types';

interface QuotationViewProps {
  quotation: Quotation;
}

export function QuotationView({ quotation }: QuotationViewProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [creatorBusiness, setCreatorBusiness] = React.useState<BusinessDetails | undefined>(undefined);

  React.useEffect(() => {
    const fetchCreatorBusiness = async () => {
      console.log('[QuotationView] Fetching creator business details...');
      console.log('[QuotationView] quotation.createdBy:', quotation.createdBy);
      console.log('[QuotationView] currentUser?.id:', currentUser?.id);
      console.log('[QuotationView] currentUser?.businessDetails:', currentUser?.businessDetails);

      // If the current user is the creator, we might already have the data in context
      if (currentUser?.id === quotation.createdBy && currentUser.businessDetails) {
        console.log('[QuotationView] Using current user business details');
        setCreatorBusiness(currentUser.businessDetails);
        return;
      }

      // If no createdBy field, leave as undefined (DocumentHeader will use system defaults)
      if (!quotation.createdBy) {
        console.warn('[QuotationView] No createdBy field found in quotation');
        return;
      }

      try {
        console.log('[QuotationView] Fetching creator document from Firestore...');
        const creatorDoc: any = await usersService.getById(quotation.createdBy);
        console.log('[QuotationView] Creator document:', creatorDoc);

        if (creatorDoc?.businessDetails) {
          console.log('[QuotationView] Found creator business details in user doc:', creatorDoc.businessDetails);
          setCreatorBusiness(creatorDoc.businessDetails);
        } else {
          console.warn('[QuotationView] Creator document has no businessDetails, trying businesses collection...');
          const businessData = await usersService.getBusinessDetails(quotation.createdBy);
          if (businessData) {
            console.log('[QuotationView] Found creator business details in businesses collection:', businessData);
            setCreatorBusiness(businessData as any);
          } else {
            console.warn('[QuotationView] No business details found in businesses collection either.');
          }
        }
      } catch (error) {
        console.error("[QuotationView] Error fetching creator business details:", error);
      }
    };

    fetchCreatorBusiness();
  }, [quotation.createdBy, currentUser]);

  const handleDownloadPdf = () => {
    try {
      generatePdfDocument(quotation, 'Quotation', creatorBusiness);
      toast({
        title: "PDF Generated",
        description: `Quotation ${quotation.id}.pdf has been downloaded.`,
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

  const getStatusBadgeVariant = (status: QuotationStatus) => {
    switch (status) {
      case 'Won':
        return 'default';
      case 'Sent':
      case 'To Send':
        return 'secondary';
      case 'Rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const amountBeforeVat = Math.max(0, quotation.subTotal - (quotation.discount || 0));

  return (
    <Card className="shadow-xl w-full max-w-4xl mx-auto">
      <CardHeader className="bg-muted/30 p-6">
        <DocumentHeader businessDetails={creatorBusiness} />
        <div className="flex flex-col sm:flex-row justify-between items-start pt-4">
          <div>
            <CardTitle className="text-2xl font-bold text-primary mb-1">Quotation</CardTitle>
            <CardDescription>ID: {quotation.id}</CardDescription>
          </div>
          <div className="text-sm text-right mt-2 sm:mt-0 space-y-1">
            <p><strong>Date:</strong> {formatDate(quotation.quotationDate)}</p>
            <p><strong>Expires:</strong> {formatDate(quotation.expiryDate)}</p>
            <div className="flex items-center justify-end"><strong>Status:</strong>
              <Badge
                variant={getStatusBadgeVariant(quotation.status)}
                className="capitalize text-sm ml-1"
              >
                {quotation.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-1">Bill To:</h3>
          <p className="font-medium">{quotation.clientName}</p>
          {quotation.clientCompany && <p>{quotation.clientCompany}</p>}
          <p>Email: {quotation.clientEmail}</p>
          {quotation.clientPhone && <p>Phone: {quotation.clientPhone}</p>}
          {quotation.clientAddress && <p>Address: {quotation.clientAddress}</p>}
          {quotation.clientBRN && <p>BRN: {quotation.clientBRN}</p>}
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
            {quotation.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="font-medium">{item.description || "Unknown Item"}</span>
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.unitPrice, quotation.currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.total, quotation.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-end mb-6">
          <div className="w-full max-w-xs space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <span className="text-right text-muted-foreground">Subtotal:</span>
              <span className="text-right font-medium">{formatCurrency(quotation.subTotal, quotation.currency)}</span>

              {(quotation.discount || 0) > 0 && (
                <>
                  <span className="text-right text-destructive">Discount:</span>
                  <span className="text-right text-destructive">-{formatCurrency(quotation.discount!, quotation.currency)}</span>
                </>
              )}

              <span className="text-right text-muted-foreground">Amount before VAT:</span>
              <span className="text-right font-medium">{formatCurrency(amountBeforeVat, quotation.currency)}</span>

              <span className="text-right text-muted-foreground">VAT ({VAT_RATE * 100}%):</span>
              <span className="text-right font-medium">{formatCurrency(quotation.vatAmount, quotation.currency)}</span>

              <div className="col-span-2 border-t pt-2 mt-2 border-primary grid grid-cols-2 gap-4">
                <span className="text-right font-bold text-lg">Grand Total:</span>
                <span className="text-right font-bold text-lg">{formatCurrency(quotation.grandTotal, quotation.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {quotation.notes && (
          <div className="mb-6 p-4 bg-muted/50 rounded-md">
            <h4 className="font-semibold mb-1">Notes:</h4>
            <p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-6 border-t flex flex-col gap-6">
        <p className="text-xs text-muted-foreground text-center w-full">
          Thank you for your business! <br /> All prices are in {quotation.currency}. This quotation is valid until {formatDate(quotation.expiryDate)}.
        </p>
        <div className="flex gap-4 justify-center w-full">
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
