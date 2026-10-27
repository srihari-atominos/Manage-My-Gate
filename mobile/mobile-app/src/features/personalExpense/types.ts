export type TransactionType = 'EXPENSE' | 'INCOME';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'OTHER';
export type PaymentSettlement = 'PAID' | 'UNPAID';
export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FieldConfidence {
  score: number;
  level: ConfidenceLevel;
}

export interface ExtractionWarning {
  code: string;
  message: string;
  field?: string;
  candidates?: Record<string, any>;
}

export interface OcrDisagreement {
  field: string;
  message: string;
  tesseractValue?: any;
  oxrValue?: any;
}

export interface ReceiptItem {
  description?: string;
  itemName?: string;
  quantity?: number;
  unitPriceMinor?: number;
  unitPrice?: number;
  amountMinor?: number;
  amount?: number;
  confidence?: number;
}

export interface PersonalExpenseReceiptOcr {
  merchant?: string | null;
  merchantAddress?: string | null;
  receiptNumber?: string | null;
  invoiceNumber?: string | null;
  billNumber?: string | null;
  transactionId?: string | null;
  orderId?: string | null;
  documentType?: string | null;
  receiptDate?: string | null;
  currency?: 'INR' | string | null;
  subtotalMinor?: number | null;
  taxMinor?: number | null;
  discountMinor?: number | null;
  additionalChargesMinor?: number | null;
  totalMinor?: number | null;
  totalAmount?: number | null;
  items?: ReceiptItem[];
  confidence?: number | null;
  fieldConfidence?: {
    total?: FieldConfidence;
    date?: FieldConfidence;
    merchant?: FieldConfidence;
    reference?: FieldConfidence;
  };
  warnings?: ExtractionWarning[];
  needsReview?: boolean;
  isPaymentScreenshot?: boolean;
  paymentMethod?: string | null;
  paymentApplication?: string | null;
  payeeUpiId?: string | null;
  transactionReference?: string | null;
  settlement?: 'PAID' | 'PENDING' | 'FAILED' | null;
  suggestedExpenseName?: string | null;
  suggestedCategory?: string | null;
  suggestedExpenseType?: string | null;
  suggestedNotes?: string | null;
  notes?: string | null;
  ocrEngine?: 'tesseract' | 'oxr' | 'dual' | string | null;
  mode?: 'tesseract' | 'oxr' | 'dual' | 'fallback' | string | null;
  disagreements?: OcrDisagreement[];
  provenance?: Record<string, any>;
  documentDisplayedStatus?: string | null;
  verifiedPaymentStatus?: string | null;
  confirmedAt?: string;
}

export interface PersonalExpenseReceipt {
  originalName?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
  ocrStatus?: OcrStatus;
  ocrError?: string | null;
  ocrEngineStatus?: string | null;
  ocr?: PersonalExpenseReceiptOcr | null;
}

export interface PersonalExpenseTransaction {
  _id: string;
  type: TransactionType;
  amountMinor: number;
  currency: 'INR';
  categoryId: string;
  categoryName: string;
  transactionDate: string;
  paymentMethod: PaymentMethod;
  paymentSettlement: PaymentSettlement;
  merchantOrSource: string;
  notes: string;
  reference: string | null;
  receipt?: PersonalExpenseReceipt | null;
  createdAt: string;
}

export interface PersonalExpenseCategory {
  id: string;
  name: string;
  type: TransactionType;
  isDefault: boolean;
}

export interface PersonalExpenseBudget {
  _id: string;
  period: string;
  categoryId: string | null;
  amountMinor: number;
}

export interface CategoryTotal {
  _id: { categoryId: string; categoryName: string };
  amountMinor: number;
}

export interface Dashboard {
  period: string;
  incomeMinor: number;
  expenseMinor: number;
  balanceMinor: number;
  categoryBreakdown: CategoryTotal[];
  budgets: PersonalExpenseBudget[];
  recentTransactions: PersonalExpenseTransaction[];
}

export interface TransactionPage {
  items: PersonalExpenseTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: string;
  transactionDate: string;
  paymentMethod: PaymentMethod;
  paymentSettlement: PaymentSettlement;
  merchantOrSource?: string;
  notes?: string;
  reference?: string | null;
}

export interface TransactionWriteResult {
  transaction: PersonalExpenseTransaction;
  duplicateWarning: boolean;
  possibleDuplicates: PersonalExpenseTransaction[];
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}
