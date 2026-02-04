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

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(amount: number | undefined | null, currency: string = 'MUR'): string {
  const safeAmount = (amount === undefined || amount === null || isNaN(amount)) ? 0 : amount;
  const cacheKey = currency || 'MUR';

  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(cacheKey, new Intl.NumberFormat('en-MU', { style: 'currency', currency: cacheKey }));
  }

  return formatterCache.get(cacheKey)!.format(safeAmount);
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

export function isValidBRN(brn: string): boolean {
  if (!brn) return false;
  // Format: 1 Alphabet prefix C or I, followed by 8 digits
  const brnRegex = /^[CI]\d{8}$/i;
  return brnRegex.test(brn.trim());
}
