export type TransactionType = 'EXPENSE' | 'INCOME';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'OTHER';
export type PaymentSettlement = 'PAID' | 'UNPAID';
export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export interface ReceiptItem { description?: string; quantity?: number; unitPriceMinor?: number; amountMinor?: number; confidence?: number; }
export interface PersonalExpenseReceipt { originalName?: string; mimeType?: string; size?: number; uploadedAt?: string; ocrStatus?: OcrStatus; ocrError?: string | null; ocrEngineStatus?: string | null; ocr?: { merchant?: string | null; merchantAddress?: string | null; receiptNumber?: string | null; receiptDate?: string | null; currency?: 'INR' | null; subtotalMinor?: number | null; taxMinor?: number | null; discountMinor?: number | null; additionalChargesMinor?: number | null; totalMinor?: number | null; items?: ReceiptItem[]; confidence?: number | null; confirmedAt?: string }; }
export interface PersonalExpenseTransaction { _id: string; type: TransactionType; amountMinor: number; currency: 'INR'; categoryId: string; categoryName: string; transactionDate: string; paymentMethod: PaymentMethod; paymentSettlement: PaymentSettlement; merchantOrSource: string; notes: string; reference: string | null; receipt?: PersonalExpenseReceipt | null; createdAt: string; }
export interface PersonalExpenseCategory { id: string; name: string; type: TransactionType; isDefault: boolean; }
export interface PersonalExpenseBudget { _id: string; period: string; categoryId: string | null; amountMinor: number; }
export interface CategoryTotal { _id: { categoryId: string; categoryName: string }; amountMinor: number; }
export interface Dashboard { period: string; incomeMinor: number; expenseMinor: number; balanceMinor: number; categoryBreakdown: CategoryTotal[]; budgets: PersonalExpenseBudget[]; recentTransactions: PersonalExpenseTransaction[]; }
export interface TransactionPage { items: PersonalExpenseTransaction[]; total: number; page: number; limit: number; totalPages: number; }
export interface TransactionInput { type: TransactionType; amount: number; categoryId: string; transactionDate: string; paymentMethod: PaymentMethod; paymentSettlement: PaymentSettlement; merchantOrSource?: string; notes?: string; reference?: string | null; }
export interface TransactionWriteResult { transaction: PersonalExpenseTransaction; duplicateWarning: boolean; possibleDuplicates: PersonalExpenseTransaction[]; }
export interface TransactionFilters { page?: number; limit?: number; type?: TransactionType; categoryId?: string; startDate?: string; endDate?: string; }