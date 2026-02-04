
import type { User } from './types';

export const COMPANY_DETAILS = {
  name: "Festival International Des Saveurs Ltd.",
  brn: "C24215222",
  vat: "28111871",
  address: "23, Floor 2, Block 4, The Docks, Port Louis",
  tel: "+230 215 3090",
  url: "www.fids-maurice.online",
  email: "info@fids-maurice.online",
};


export const VAT_RATE = 0.15; // 15%

export const QUOTATION_STATUSES = ['To Send', 'Sent', 'Won', 'Lost', 'Rejected'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const INVOICE_STATUSES = ['To Send', 'Sent', 'Partly Paid', 'Fully Paid'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const RECEIPT_STATUSES = ['To Send', 'Sent'] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export const STATEMENT_STATUSES = ['Draft', 'Sent'] as const;
export type StatementStatus = (typeof STATEMENT_STATUSES)[number];

// Color Mappings (Tailwind classes)
export const STATUS_COLORS: Record<string, string> = {
  // Quotations / Invoices / Receipts / Statements
  'To Send': 'bg-red-500 text-white',
  'Sent': 'bg-orange-500 text-white',
  'Won': 'bg-green-500 text-white',
  'Lost': 'bg-gray-400 text-white',
  'Rejected': 'bg-red-700 text-white',
  'Partly Paid': 'bg-sky-400 text-white',
  'Fully Paid': 'bg-green-600 text-white',
  'Void': 'bg-gray-700 text-white',
  'Draft': 'bg-amber-400 text-white',
};

export const APP_NAME = "BSA CRM Systems";

export const USERS: User[] = [
  { id: "user-1", email: "alain.bertrand.mu@gmail.com", password: "Ab@280765", role: "Super Admin", name: "Alain BERTRAND" },
  { id: "user-2", email: "wesley@fids-maurice.online", password: "Wr@280765", role: "User", name: "Wesley ROSE" },
  { id: "user-3", email: "stephan@fids-maurice.online", password: "St@280765", role: "User", name: "Stephan TOURMENTIN" },
  { id: "user-4", email: "catheleen@fids-maurice.online", password: "Cm@280765", role: "User", name: "Catheleen MARIMOOTOO" },
];

export const LOCAL_STORAGE_AUTH_KEY = 'expoStandProUser';
