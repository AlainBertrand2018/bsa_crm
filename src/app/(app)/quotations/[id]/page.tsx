
"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuotationView } from '@/components/quotations/QuotationView';
import { EmptyState } from '@/components/shared/EmptyState';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSearch, Edit } from 'lucide-react';
import Link from 'next/link';
import type { Quotation } from '@/lib/types';
import { supabaseService } from '@/lib/supabaseService';
import { useAuth } from '@/context/AuthContext';
import { generatePdfDocument } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';

export default function ViewQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Admin' ||
    (quotation && quotation.createdBy === currentUser?.id);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      supabaseService.quotations.getById(id)
        .then(data => {
          if (data) {
            const transformedData: Quotation = {
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
            setQuotation(transformedData);
          } else {
            setQuotation(null);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!quotation) return;
    setIsDownloading(true);
    try {
      let businessDetails = currentUser?.businessDetails;
      if (currentUser?.id !== quotation.createdBy && quotation.createdBy) {
        const profile: any = await supabaseService.profiles.get(quotation.createdBy);
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
      generatePdfDocument(quotation, 'Quotation', businessDetails);
      toast({ title: "Success", description: "PDF downloaded successfully." });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <FullPageLoading message="Loading quotation details..." />;
  }

  if (!quotation) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quotations
        </Button>
        <EmptyState
          icon={FileSearch}
          title="Quotation Not Found"
          description={`The quotation with ID "${id}" could not be found. It might have been deleted or the ID is incorrect.`}
          actionText="View All Quotations"
          actionHref="/quotations"
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Quotation ${quotation.id}`}
        description={`Details for quotation to ${quotation.clientName}.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
              <Download className="mr-2 h-4 w-4" /> {isDownloading ? "Generating..." : "Download PDF"}
            </Button>
            {canEdit && (
              <Link href={`/quotations/${id}/edit`}>
                <Button variant="default">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              </Link>
            )}
          </div>
        }
      />
      <QuotationView quotation={quotation} />
    </>
  );
}
