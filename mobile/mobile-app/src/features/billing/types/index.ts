export type InvoiceStatus =
  | 'UNPAID'
  | 'PAID'
  | 'VERIFICATION_PENDING'
  | 'PARTIAL'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'FAILED'
  | 'UNKNOWN';

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  communityId?: string;
  unitId?: any;
  unitNumber?: string;
  targetUserId?: any;
  targetUser?: string;
  assessmentName?: string;
  billingPeriodString?: string;
  dueDate?: string;
  totalDue?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  amount?: number;
  currency?: string;
  status: InvoiceStatus;
  paymentMethod?: string;
  offlineReference?: string | null;
  items?: InvoiceItem[];
  createdAt?: string;
  updatedAt?: string;
  date?: string;
}

export interface BillingKPIs {
  grossDemand: number;
  grossDemandCount: number;
  totalCollected: number;
  inTransitGateway: number;
  totalUnpaidArrears: number;
  pendingOffline?: number;
}

export interface UnitDueBreakdown {
  _id?: string;
  invoiceId: string;
  invoiceNumber: string;
  unitId?: string;
  unitNumber?: string;
  totalDue: number;
  outstandingAmount?: number;
  paidAmount?: number;
  billingPeriodString?: string;
  status: InvoiceStatus;
  dueDate?: string;
}

export interface ActiveDues {
  totalPortfolioDue: number;
  unitBreakdown: UnitDueBreakdown[];
  secondaryCompliance?: any[];
  recentInvoices?: Invoice[];
}

export interface InvoicesGridPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

export interface InvoicesGridResponse {
  data: any[];
  statusCounts?: Record<string, number>;
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  limit?: number;
  pagination?: InvoicesGridPagination;
}

export interface OfflineSettlementPayload {
  invoiceId: string;
  offlineReference: string;
  paymentMethod: string;
  offlineAmount?: number;
  amount?: number;
}

export interface RazorpayOrderPayload {
  invoiceId: string;
  amount: number;
}

export interface RazorpayVerificationPayload {
  paymentId?: string;
  payment_id?: string;
  orderId?: string;
  razorpayOrderId?: string;
  razorpay_order_id?: string;
  razorpayPaymentId?: string;
  razorpay_payment_id?: string;
  razorpaySignature?: string;
  razorpay_signature?: string;
}

export interface WalletState {
  balance: number;
  activePasses?: any[];
  transactionHistory?: any[];
  transactions?: any[];
  loading?: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface BillingState {
  kpis: BillingKPIs;
  activeDues: ActiveDues;
  invoicesList: any[];
  statusCounts: Record<string, number>;
  pagination: InvoicesGridPagination;
  loadingStates: {
    fetchKPIs: boolean;
    fetchDues: boolean;
    fetchGrid: boolean;
    triggerRun: boolean;
    settleInvoice: boolean;
  };
  error: string | null;
}
