"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { InvoiceView } from '@/components/invoices/InvoiceView';
import { EmptyState } from '@/components/shared/EmptyState';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSearch } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import { supabaseService } from '@/lib/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { generatePdfDocument } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';

export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      supabaseService.invoices.getById(id)
        .then(data => {
          if (data) {
            const transformedData: Invoice = {
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
              createdBy: data.user_id || data.createdBy
            };
            setInvoice(transformedData);
          } else {
            setInvoice(null);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    try {
      let businessDetails = currentUser?.businessDetails;
      if (currentUser?.id !== invoice.createdBy && invoice.createdBy) {
        const profile: any = await supabaseService.profiles.get(invoice.createdBy);
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
      }
      generatePdfDocument(invoice, 'Invoice', businessDetails);
      toast({ title: "Success", description: "PDF downloaded successfully." });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <FullPageLoading message="Loading invoice details..." />;
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <EmptyState
          icon={FileSearch}
          title="Invoice Not Found"
          description={`The invoice with ID "${id}" could not be found. It might have been deleted or the ID is incorrect.`}
          actionText="View All Invoices"
          actionHref="/invoices"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Invoice ${invoice.id}`}
        description={`Details for invoice to ${invoice.clientName}.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
              <Download className="mr-2 h-4 w-4" /> {isDownloading ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        }
      />
      <InvoiceView invoice={invoice} />
    </>
  );
}
