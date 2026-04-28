"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { InvoicesTable } from '@/components/invoices/InvoicesTable';
import type { Invoice } from '@/lib/types';
import { InvoiceStatus } from '@/lib/constants';
import { supabaseService } from '@/lib/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { calculateTotals } from '@/lib/utils';
import { VAT_RATE } from '@/lib/constants';

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchInvoices = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const data = await supabaseService.invoices.getAll(currentUser.id, currentUser.role, currentUser.companyId);

      const transformedData = data.map((inv: any) => {
        const { subTotal, vatAmount, grandTotal } = calculateTotals(inv.items || [], VAT_RATE, inv.discount || 0);
        return {
          ...inv,
          clientName: inv.clients?.client_name || inv.clientName,
          clientEmail: inv.clients?.client_email || inv.clientEmail,
          clientCompany: inv.clients?.client_company || inv.clientCompany,
          invoiceDate: inv.invoice_date || inv.invoiceDate,
          dueDate: inv.due_date || inv.dueDate,
          subTotal,
          vatAmount,
          grandTotal,
          totalPaid: inv.total_paid || inv.totalPaid,
          createdBy: inv.user_id || inv.createdBy
        };
      });

      setInvoices(transformedData as Invoice[]);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({ title: "Error", description: "Failed to fetch invoices.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleUpdateStatus = async (id: string, status: InvoiceStatus) => {
    setIsLoading(true);
    try {
      await supabaseService.invoices.update(id, { status });
      setInvoices(prevInvoices =>
        prevInvoices.map(inv => inv.id === id ? { ...inv, status } : inv)
      );
      toast({
        title: "Status Updated",
        description: `Invoice ${id} status changed to ${status}.`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <PageHeader
        title="Invoices"
        description="View and manage all generated invoices."
      // No create button for invoices as they are auto-generated
      />
      <InvoicesTable
        invoices={invoices}
        isLoading={isLoading}
        onUpdateStatus={handleUpdateStatus}
        onDelete={fetchInvoices}
      />
    </>
  );
}
