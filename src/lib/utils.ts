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

export function calculateTotals(items: any[], vatRate: number = 0.15, discount: number = 0) {
  const subTotal = (items || []).reduce((sum, item) => {
    // Try to get quantity from various common names
    const qty = Number(item.quantity ?? item.qty ?? 0);
    
    // Try to get unit price from various common names
    const price = Number(item.unitPrice ?? item.unit_price ?? item.price ?? item.rate ?? 0);
    
    let itemTotal = qty * price;
    
    // Fallback to item.total if the above calculation resulted in 0 but a total exists
    if (itemTotal === 0 && item.total) {
      itemTotal = Number(item.total) || 0;
    }
    
    return sum + itemTotal;
  }, 0);
  
  const discountAmount = Number(discount) || 0;
  const amountBeforeVat = Math.max(0, subTotal - discountAmount);
  const vatAmount = amountBeforeVat * vatRate;
  const grandTotal = amountBeforeVat + vatAmount;
  
  return { subTotal, vatAmount, grandTotal, amountBeforeVat, discountAmount };
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
