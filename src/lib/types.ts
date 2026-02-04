
import type { QuotationStatus, InvoiceStatus, ReceiptStatus, StatementStatus } from "./constants";

export interface ClientDetails {
  id?: string;
  clientName: string;
  clientCompany?: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  clientBRN?: string;
  companyId?: string;
  createdBy?: string;
}

export interface DocumentItem {
  id: string;
  productTypeId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation extends ClientDetails {
  id: string;
  clientId: string;
  quotationDate: string;
  expiryDate: string;
  items: DocumentItem[];
  subTotal: number;
  discount?: number;
  vatAmount: number;
  grandTotal: number;
  status: QuotationStatus;
  notes?: string;
  currency: string;
  companyId?: string;
  createdBy: string;
}

export interface Invoice extends ClientDetails {
  id: string;
  clientId: string;
  quotationId?: string;
  invoiceDate: string;
  dueDate: string;
  items: DocumentItem[];
  subTotal: number;
  discount?: number;
  vatAmount: number;
  grandTotal: number;
  totalPaid: number;
  status: InvoiceStatus;
  notes?: string;
  currency: string;
  companyId?: string;
  createdBy: string;
}

export interface BusinessDetails {
  id?: string;
  businessName: string;
  businessAddress: string;
  brn: string;
  telephone: string;
  position: string;
  email: string;
  vatNo?: string;
  mobilePhone?: string;
  whatsapp?: string;
  facebookPage?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
  createdAt?: string;
}

export interface OnboardingProduct {
  id: string;
  name: string;
  type: 'Digital DL' | 'Service' | 'Physical';
  description: string;
  bulkPrice: number;
  unitPrice: number;
  rrp: number;
  minOrder: number;
  available?: number; // Deprecated
  inventory: number;
  companyId?: string;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: 'Super Admin' | 'Admin' | 'User';
  companyId?: string;
  onboardingCompleted?: boolean;
  onboardingStatus?: string;
  status?: 'active' | 'suspended' | 'locked' | 'terminated';
  businessName?: string;
  businessDetails?: BusinessDetails;
  products?: OnboardingProduct[];
}

export type Product = OnboardingProduct;

export interface Receipt {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  clientName: string;
  clientCompany?: string;
  status: ReceiptStatus;
  companyId?: string;
  createdBy: string;
}

export interface Statement {
  id: string;
  clientName: string;
  period: string;
  date: string;
  amount: number;
  status: StatementStatus;
  companyId?: string;
  createdBy: string;
}

export interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password_provided: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
