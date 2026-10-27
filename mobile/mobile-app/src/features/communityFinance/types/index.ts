export type ReportingPeriod =
  | 'Today'
  | 'This Week'
  | 'This Month'
  | 'Last Month'
  | 'This Year'
  | 'Previous Year'
  | 'All Time';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface RunwayAnalytics {
  remainingBalance: number;
  averageMonthlyExpenses: number;
  averageMonthlyCollections: number;
  netMonthlyBurn: number;
  isSelfSustaining: boolean;
  runwayMonths: number | null;
  grossRunwayMonths: number | null;
  runwayHealth: 'SURPLUS' | 'HEALTHY' | 'CAUTION' | 'CRITICAL';
  projectedDepletionDate: string | null;
}

export interface DashboardOverview {
  grossSuccessfulCollections: number;
  maintenanceCollections: number;
  amenityCollections: number;
  completedRefunds: number;
  netCollectionsAfterRefunds: number;
  refundableDepositsHeld: number;
  walletTopUpsExcludedFromIncome: number;
  pendingOfflinePaymentVerifications: number;
  unresolvedReconciliationExceptions: number;
  totalExpensesIncurred: number;
  recordedExpensePayments: number;
  reconciledExpensePayments: number;
  outstandingVendorLiabilities: number;
  pendingExpenseVerification: number;
  confirmedExpenseDisbursements: number;
  netSurplusOrDeficit: number;
  accrualSurplusOrDeficit: number;
  currentPeriodCharges?: number;
  outstandingDues?: number;
  runway?: RunwayAnalytics;
}

export interface IncomeBreakdownItem {
  source: string;
  domain: string;
  amount: number;
  percentage: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  periodKey: string;
  label: string;
  income: number;
  expense: number;
  netSurplus: number;
}

export interface DashboardData {
  generatedAt: string;
  filters: {
    startDate: string | null;
    endDate: string | null;
    invoiceStatus: string | null;
    timezone: string;
  };
  overview: DashboardOverview;
  runway?: RunwayAnalytics;
  breakdowns: {
    income: IncomeBreakdownItem[];
    expense: ExpenseBreakdownItem[];
  };
  timeSeries: TimeSeriesPoint[];
  dailyTimeSeries?: TimeSeriesPoint[];
  monthlyTimeSeries?: TimeSeriesPoint[];
  yearlyTimeSeries?: TimeSeriesPoint[];
  allTimeSeries?: TimeSeriesPoint[];
}

export interface NormalizedTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  date: string | null;
  description: string;
  domain: string;
  status: string;
  referenceId: string | null;
  referenceType: string;
  paymentMethod: string;
  receiptNumber: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TransactionsResponse {
  transactions: NormalizedTransaction[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type TransactionTypeFilter = 'all' | 'income' | 'expense';
export type TransactionDomainFilter = 'ALL' | 'INVOICE' | 'AMENITY' | 'EXPENSE';
export type TransactionStatusFilter =
  | 'ALL'
  | 'SUCCESS'
  | 'PAID'
  | 'RECONCILED'
  | 'RECORDED'
  | 'PENDING'
  | 'VERIFICATION_PENDING'
  | 'FAILED'
  | 'REFUNDED'
  | 'VOIDED';

export interface TransactionFilters {
  period: ReportingPeriod;
  type: TransactionTypeFilter;
  domain: TransactionDomainFilter;
  status: TransactionStatusFilter;
  search: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface TransactionsPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  hasNextPage: boolean;
}
