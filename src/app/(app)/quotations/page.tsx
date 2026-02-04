"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuotationsTable } from '@/components/quotations/QuotationsTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import type { Quotation } from '@/lib/types';
import { QuotationStatus } from '@/lib/constants';
import { supabaseService } from '@/lib/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function QuotationsListPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();

  const fetchQuotations = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      console.log("Fetching quotations for user:", currentUser.id, "Role:", currentUser.role);
      const data = await supabaseService.quotations.getAll(currentUser.id, currentUser.role, currentUser.companyId);
      console.log("Fetched quotations:", data);

      // Transform data to match local types (handling snake_case if necessary)
      const transformedData = data.map((q: any) => ({
        ...q,
        clientName: q.clients?.client_name || q.clientName,
        clientEmail: q.clients?.client_email || q.clientEmail,
        clientCompany: q.clients?.client_company || q.clientCompany,
        expiryDate: q.expiry_date || q.expiryDate,
        quotationDate: q.quotation_date || q.quotationDate,
        subTotal: q.sub_total || q.subTotal,
        vatAmount: q.vat_amount || q.vatAmount,
        grandTotal: q.grand_total || q.grandTotal,
        createdBy: q.user_id || q.createdBy
      }));

      setQuotations(transformedData as Quotation[]);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      console.error("Error fetching quotations:", error);
      toast({ title: "Error", description: "Failed to fetch quotations.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleUpdateStatus = async (id: string, status: QuotationStatus) => {
    try {
      await supabaseService.quotations.update(id, { status });
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, status } : q));

      toast({
        title: "Status Updated",
        description: `Quotation ${id} status changed to ${status}.`,
      });

      if (status === 'Won') {
        // AUTOMATIC INVOICE GENERATION
        try {
          const quotationToConvert = quotations.find(q => q.id === id);
          if (quotationToConvert) {
            const invoiceData = {
              clientId: quotationToConvert.clientId || '',
              quotationId: quotationToConvert.id,
              clientName: quotationToConvert.clientName,
              clientCompany: quotationToConvert.clientCompany,
              clientEmail: quotationToConvert.clientEmail,
              clientPhone: quotationToConvert.clientPhone || '',
              clientAddress: quotationToConvert.clientAddress || '',
              clientBRN: quotationToConvert.clientBRN || '',
              items: quotationToConvert.items,
              subTotal: quotationToConvert.subTotal,
              discount: quotationToConvert.discount || 0,
              vatAmount: quotationToConvert.vatAmount,
              grandTotal: quotationToConvert.grandTotal,
              currency: quotationToConvert.currency,
              notes: `Generated from Quotation ${quotationToConvert.id}`,
              status: 'To Send', // Default invoice status
              totalPaid: 0,
              invoiceDate: new Date().toISOString(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
              createdBy: currentUser?.id,
              companyId: currentUser?.companyId,
            };

            await supabaseService.invoices.create(invoiceData as any);

            toast({
              title: "Invoice Generated",
              description: `An invoice has been automatically created for Quotation ${id}.`,
              duration: 5000,
              action: <Button variant="outline" size="sm" onClick={() => router.push('/invoices')}>View Invoices</Button>
            });
            return; // Exit early as we handled the success toast here
          }
        } catch (err) {
          console.error("Error auto-generating invoice:", err);
          // Fallthrough to standard success message but warn about invoice failure?
          // Or just log it. For now, we continue to show the status update success.
        }
      }

      toast({
        title: "Status Updated",
        description: `Quotation ${id} status changed to ${status}.`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Manage all your quotations and their statuses."
        actions={
          <Link href="/quotations/new">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Quotation
            </Button>
          </Link>
        }
      />
      <QuotationsTable
        quotations={quotations}
        onUpdateStatus={handleUpdateStatus}
        onDelete={fetchQuotations}
        isLoading={isLoading}
      />
    </>
  );
}
