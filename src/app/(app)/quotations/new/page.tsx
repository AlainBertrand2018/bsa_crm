
"use client";
import { PageHeader } from '@/components/shared/PageHeader';
import { QuotationForm } from '@/components/quotations/QuotationForm';
import { Card, CardContent } from '@/components/ui/card';
import { supabaseService } from '@/lib/supabaseService';
import { Quotation } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export default function NewQuotationPage() {
  const { currentUser } = useAuth();

  const handleFormSubmit = async (quotationData: Quotation): Promise<void> => {
    const supabaseData = {
      id: quotationData.id,
      user_id: quotationData.createdBy || currentUser?.id,
      client_id: quotationData.clientId,
      quotation_date: quotationData.quotationDate,
      expiry_date: quotationData.expiryDate,
      items: quotationData.items,
      sub_total: quotationData.subTotal,
      discount: quotationData.discount,
      vat_amount: quotationData.vatAmount,
      grand_total: quotationData.grandTotal,
      clientName: quotationData.clientName,
      clientEmail: quotationData.clientEmail,
      clientCompany: quotationData.clientCompany,
      clientPhone: quotationData.clientPhone,
      clientAddress: quotationData.clientAddress,
      clientBRN: quotationData.clientBRN,
      status: quotationData.status,
      currency: quotationData.currency,
      notes: quotationData.notes,
      companyId: currentUser?.companyId,
    };
    await supabaseService.quotations.create(supabaseData);
  };

  return (
    <>
      <PageHeader
        title="Create New Quotation"
        description="Fill in the details below to generate a new quotation."
      />
      <Card className="shadow-xl">
        <CardContent className="p-6 md:p-8">
          <QuotationForm
            saveQuotation={handleFormSubmit}
            mode="create"
          />
        </CardContent>
      </Card>
    </>
  );
}
