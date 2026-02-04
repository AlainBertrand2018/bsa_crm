
"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuotationForm } from '@/components/quotations/QuotationForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileSearch } from 'lucide-react';
import type { Quotation } from '@/lib/types';
import { supabaseService } from '@/lib/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = typeof params.id === 'string' ? params.id : '';

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  const { currentUser, isLoading: authIsLoading } = useAuth();
  const canEdit = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || (quotation && quotation.createdBy === currentUser?.id);

  useEffect(() => {
    if (authIsLoading) return;

    if (id) {
      setIsLoading(true);
      supabaseService.quotations.getById(id)
        .then(data => {
          if (data) {
            // Transform data to match local types
            const quotationData: Quotation = {
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

            // RBAC Check for Edit
            const isOwner = quotationData.createdBy === currentUser?.id;
            const canEdit = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || isOwner;

            if (!canEdit) {
              toast({
                title: "Access Denied",
                description: "You do not have permission to edit this quotation.",
                variant: "destructive",
              });
              router.replace('/quotations');
              return;
            }

            setQuotation(quotationData);
            setIsNotFound(false);
          } else {
            setQuotation(null);
            setIsNotFound(true);
          }
        })
        .catch(error => {
          console.error("Failed to fetch quotation for editing:", error);
          setIsNotFound(true);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setIsNotFound(true);
    }
  }, [id, authIsLoading, currentUser, router, toast]);

  const handleFormSubmit = async (updatedQuotationData: Quotation) => {
    if (!quotation) return;
    const supabaseData = {
      user_id: updatedQuotationData.createdBy,
      client_id: updatedQuotationData.clientId,
      quotation_date: updatedQuotationData.quotationDate,
      expiry_date: updatedQuotationData.expiryDate,
      items: updatedQuotationData.items,
      sub_total: updatedQuotationData.subTotal,
      discount: updatedQuotationData.discount,
      vat_amount: updatedQuotationData.vatAmount,
      grand_total: updatedQuotationData.grandTotal,
      status: updatedQuotationData.status,
      currency: updatedQuotationData.currency,
      notes: updatedQuotationData.notes,
    };
    return supabaseService.quotations.update(id, supabaseData);
  };

  if (isLoading || authIsLoading) {
    return <FullPageLoading message="Loading quotation for editing..." />;
  }

  if (isNotFound || !quotation) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quotations
        </Button>
        <EmptyState
          icon={FileSearch}
          title="Quotation Not Found"
          description={`The quotation with ID "${id}" could not be found or you do not have permission to edit it.`}
          actionText="View All Quotations"
          actionHref="/quotations"
        />
      </div>
    );
  }

  if (!canEdit) {
    // This case should be handled by the redirect in useEffect, but as a fallback:
    return <FullPageLoading message="Access Denied. Redirecting..." />;
  }

  return (
    <>
      <PageHeader
        title={`Edit Quotation ${quotation.id}`}
        description="Modify the details of the quotation below."
        actions={
          <Button variant="outline" onClick={() => router.push(`/quotations/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel Edit
          </Button>
        }
      />
      <Card className="shadow-xl">
        <CardContent className="p-6 md:p-8">
          <QuotationForm
            initialData={quotation}
            saveQuotation={handleFormSubmit}
            mode="edit"
          />
        </CardContent>
      </Card>
    </>
  );
}
