import type { Quotation, Invoice, DocumentItem } from './types';
import { VAT_RATE, type QuotationStatus, type InvoiceStatus } from './constants';
import { generateQuotationId, generateInvoiceId, formatDate } from './utils';

const calculateTotals = (items: DocumentItem[], discount: number = 0) => {
  const subTotal = items.reduce((sum, item) => sum + item.total, 0);
  const amountBeforeVat = Math.max(0, subTotal - discount);
  const vatAmount = amountBeforeVat * VAT_RATE;
  const grandTotal = amountBeforeVat + vatAmount;
  return { subTotal, discount, vatAmount, grandTotal };
};

export let mockQuotations: Quotation[] = [];
export let mockInvoices: Invoice[] = [];


export const getMockQuotations = async (): Promise<Quotation[]> => {
  return new Promise(resolve => setTimeout(() => resolve([...mockQuotations]), 500));
};

export const getMockQuotationById = async (id: string): Promise<Quotation | undefined> => {
  return new Promise(resolve => setTimeout(() => resolve(mockQuotations.find(q => q.id === id)), 300));
};

export const addMockQuotation = async (quotationData: Quotation): Promise<Quotation> => {
  // ID, quotationDate, expiryDate should be part of quotationData now,
  // as QuotationForm prepares the full object.
  mockQuotations.unshift(quotationData);
  return new Promise(resolve => setTimeout(() => resolve(quotationData), 300));
};

export const updateMockQuotation = async (id: string, updatedQuotationData: Quotation): Promise<Quotation | undefined> => {
  const quotationIndex = mockQuotations.findIndex(q => q.id === id);
  if (quotationIndex > -1) {
    mockQuotations[quotationIndex] = { ...mockQuotations[quotationIndex], ...updatedQuotationData };

    // If status is 'Won', handle invoice generation/update
    if (updatedQuotationData.status === 'Won') {
      const existingInvoiceIndex = mockInvoices.findIndex(inv => inv.quotationId === id);
      const invoiceData = {
        clientName: updatedQuotationData.clientName,
        clientCompany: updatedQuotationData.clientCompany,
        clientEmail: updatedQuotationData.clientEmail,
        clientPhone: updatedQuotationData.clientPhone,
        clientAddress: updatedQuotationData.clientAddress,
        clientBRN: updatedQuotationData.clientBRN,
        items: updatedQuotationData.items,
        subTotal: updatedQuotationData.subTotal,
        discount: updatedQuotationData.discount,
        vatAmount: updatedQuotationData.vatAmount,
        grandTotal: updatedQuotationData.grandTotal,
        currency: updatedQuotationData.currency,
        notes: `Related to Quotation ${id}`,
        createdBy: updatedQuotationData.createdBy,
      };

      if (existingInvoiceIndex > -1) {
        // Update existing invoice
        mockInvoices[existingInvoiceIndex] = {
          ...mockInvoices[existingInvoiceIndex],
          ...invoiceData,
          // Keep original invoiceDate, dueDate, paymentStatus unless explicitly changed
        };
      } else {
        // Create new invoice
        const newInvoice: Invoice = {
          id: generateInvoiceId(updatedQuotationData.clientName),
          quotationId: id,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'To Send',
          totalPaid: 0,
          clientId: updatedQuotationData.clientId,
          ...invoiceData,
        };
        mockInvoices.unshift(newInvoice);
      }
    }
    return new Promise(resolve => setTimeout(() => resolve(mockQuotations[quotationIndex]), 300));
  }
  return new Promise(resolve => setTimeout(() => resolve(undefined), 300));
};

export const updateMockQuotationStatus = async (id: string, status: QuotationStatus): Promise<Quotation | undefined> => {
  const quotationIndex = mockQuotations.findIndex(q => q.id === id);
  if (quotationIndex > -1) {
    const quotation = mockQuotations[quotationIndex];
    quotation.status = status;

    // Call updateMockQuotation to handle consistent invoice logic
    return updateMockQuotation(id, quotation);
  }
  return new Promise(resolve => setTimeout(() => resolve(undefined), 300));
};


export const getMockInvoices = async (): Promise<Invoice[]> => {
  return new Promise(resolve => setTimeout(() => resolve([...mockInvoices]), 500));
};

export const getMockInvoiceById = async (id: string): Promise<Invoice | undefined> => {
  return new Promise(resolve => setTimeout(() => resolve(mockInvoices.find(inv => inv.id === id)), 300));
};

export const updateMockInvoiceStatus = async (id: string, status: InvoiceStatus): Promise<Invoice | undefined> => {
  const invoiceIndex = mockInvoices.findIndex(inv => inv.id === id);
  if (invoiceIndex > -1) {
    mockInvoices[invoiceIndex].status = status;
    return new Promise(resolve => setTimeout(() => resolve(mockInvoices[invoiceIndex]), 300));
  }
  return new Promise(resolve => setTimeout(() => resolve(undefined), 300));
};


// Function to explicitly clear data - useful for testing or reset
export const clearMockData = () => {
  mockQuotations = [];
  mockInvoices = [];
};

// Initialize with some data if needed, or keep empty
// clearMockData(); // Clears on load, or call this manually when needed
