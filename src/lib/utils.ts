import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | Date, dateFormat: string = 'PP'): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, dateFormat);
  } catch (error) {
    return "Invalid Date";
  }
}

export function formatCurrency(amount: number, currency: string = 'MUR'): string {
  return new Intl.NumberFormat('en-MU', { style: 'currency', currency: currency }).format(amount);
}

// Placeholder for ID generation. In a real app, this would be more robust and likely DB-driven.
let quotationCounter = 0;
let invoiceCounter = 0;

export function generateQuotationId(clientName: string = "CLIENT"): string {
  quotationCounter++;
  const dateStr = format(new Date(), 'yyyyMMdd');
  const clientPrefix = clientName.substring(0, 3).toUpperCase();
  return `Q-${clientPrefix}-${dateStr}-${String(quotationCounter).padStart(4, '0')}`;
}

export function generateInvoiceId(clientName: string = "CLIENT"): string {
  invoiceCounter++;
  const dateStr = format(new Date(), 'yyyyMMdd');
  const clientPrefix = clientName.substring(0, 3).toUpperCase();
  return `INV-${clientPrefix}-${dateStr}-${String(invoiceCounter).padStart(4, '0')}`;
}

