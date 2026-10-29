import apiClient from '../../../services/apiClient';
import {
  type DashboardData,
  type TransactionsResponse,
  type NormalizedTransaction,
  type ExportFormat,
} from '../types';

class CommunityFinanceService {
  /**
   * Fetch comprehensive community finance dashboard metrics
   */
  async fetchDashboard(params: {
    startDate?: string | null;
    endDate?: string | null;
    timezone?: string;
  }): Promise<DashboardData> {
    const cleanParams: Record<string, string> = {
      timezone: params.timezone || 'Asia/Kolkata',
    };
    if (params.startDate) cleanParams.startDate = params.startDate;
    if (params.endDate) cleanParams.endDate = params.endDate;

    const response: any = await apiClient.get('/community-finance/dashboard', {
      params: cleanParams,
    });
    const payload =
      response?.data?.kpis !== undefined || response?.data?.overview !== undefined
        ? response.data
        : (response?.kpis !== undefined || response?.overview !== undefined
          ? response
          : (response?.data !== undefined ? response.data : response));
    return (payload || {}) as DashboardData;
  }

  /**
   * Fetch paginated financial transactions
   */
  async fetchTransactions(params: {
    type?: 'all' | 'income' | 'expense';
    domain?: string;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    page?: number;
    limit?: number;
    search?: string;
    timezone?: string;
    includeLiabilities?: boolean;
  }): Promise<TransactionsResponse> {
    const cleanParams: Record<string, any> = {
      page: params.page || 1,
      limit: params.limit || 15,
      timezone: params.timezone || 'Asia/Kolkata',
    };
    if (params.type && params.type !== 'all') cleanParams.type = params.type;
    if (params.domain && params.domain !== 'ALL') cleanParams.domain = params.domain;
    if (params.status && params.status !== 'ALL') cleanParams.status = params.status;
    if (params.startDate) cleanParams.startDate = params.startDate;
    if (params.endDate) cleanParams.endDate = params.endDate;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    if (params.includeLiabilities) cleanParams.includeLiabilities = 'true';

    try {
      const response: any = await apiClient.get('/community-finance/transactions', {
        params: cleanParams,
      });

      let payload: any =
        response?.data?.transactions !== undefined
          ? response.data
          : (response?.transactions !== undefined
            ? response
            : (response?.data !== undefined ? response.data : response));

      if (!payload || typeof payload !== 'object') {
        payload = {};
      }

      const transactions: NormalizedTransaction[] = Array.isArray(payload.transactions)
        ? payload.transactions
        : (Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []));

      return {
        transactions,
        page: payload.page || params.page || 1,
        limit: payload.limit || params.limit || 15,
        total: payload.total ?? transactions.length,
        totalPages: payload.totalPages ?? (payload.total ? Math.ceil(payload.total / (payload.limit || 15)) : 1),
      };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Backend compatibility fallback: synthesize transactions from dashboard endpoint
        // when /community-finance/transactions is not deployed on this server
        return this._fallbackTransactionsFromDashboard(params);
      }
      throw err;
    }
  }

  /**
   * Graceful fallback: synthesize transactions from dashboard data when /transactions endpoint is missing (404)
   */
  private async _fallbackTransactionsFromDashboard(params: {
    type?: 'all' | 'income' | 'expense';
    domain?: string;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    page?: number;
    limit?: number;
    search?: string;
    timezone?: string;
    includeLiabilities?: boolean;
  }): Promise<TransactionsResponse> {
    try {
      const dashboard = await this.fetchDashboard({
        startDate: params.startDate,
        endDate: params.endDate,
        timezone: params.timezone,
      });

      const items: NormalizedTransaction[] = [];

      // 1. Inflows from dashboard.collections
      if (Array.isArray(dashboard?.collections)) {
        dashboard.collections.forEach((item: any) => {
          items.push({
            id: String(item._id || item.id || `coll_${Math.random()}`),
            type: 'income',
            amount: Number(item.amount || 0),
            currency: 'INR',
            date: item.createdAt || item.paymentDate || null,
            description: item.notes || (item.referenceType ? `${item.referenceType} Payment` : 'Maintenance Inflow'),
            domain: (item.domain || (item.referenceType === 'Invoice' ? 'INVOICE' : 'AMENITY')).toUpperCase(),
            status: String(item.status || 'RECORDED').toUpperCase(),
            referenceId: item.referenceId ? String(item.referenceId) : null,
            referenceType: String(item.referenceType || 'Payment'),
            paymentMethod: item.paymentMethod || null,
            receiptNumber: item.receiptNumber || null,
            vendorName: null,
            category: item.category || null,
            isDeposit: Boolean(item.isDeposit),
          });
        });
      }

      // 2. Outflows from dashboard.expenses.payments or dashboard.expenses.records
      const expensePayments = Array.isArray((dashboard as any)?.expenses?.payments)
        ? (dashboard as any).expenses.payments
        : [];
      expensePayments.forEach((item: any) => {
        items.push({
          id: String(item._id || item.id || `exp_pay_${Math.random()}`),
          type: 'expense',
          amount: Number(item.amount || 0),
          currency: 'INR',
          date: item.createdAt || item.paymentDate || null,
          description: item.notes || 'Vendor Disbursement',
          domain: 'EXPENSE',
          status: String(item.status || 'DISBURSED').toUpperCase(),
          referenceId: item.expenseId ? String(item.expenseId) : null,
          referenceType: 'ExpensePayment',
          paymentMethod: item.paymentMethod || null,
          receiptNumber: null,
          vendorName: item.vendorName || null,
          category: item.category || null,
          isDeposit: false,
        });
      });

      const expenseRecords = Array.isArray((dashboard as any)?.expenses?.records)
        ? (dashboard as any).expenses.records
        : [];
      if (items.filter((t) => t.type === 'expense').length === 0 && expenseRecords.length > 0) {
        expenseRecords.forEach((item: any) => {
          items.push({
            id: String(item._id || item.id || `exp_rec_${Math.random()}`),
            type: 'expense',
            amount: Number(item.amount || 0),
            currency: 'INR',
            date: item.createdAt || item.expenseDate || null,
            description: item.title || item.description || 'Community Expense',
            domain: 'EXPENSE',
            status: String(item.status || 'RECORDED').toUpperCase(),
            referenceId: item._id ? String(item._id) : null,
            referenceType: 'Expense',
            paymentMethod: null,
            receiptNumber: null,
            vendorName: item.vendorName || item.vendor || null,
            category: item.category || null,
            isDeposit: false,
          });
        });
      }

      // 3. Outstanding Invoices (if includeLiabilities is true)
      if (params.includeLiabilities && Array.isArray((dashboard as any)?.outstanding)) {
        (dashboard as any).outstanding.forEach((item: any) => {
          items.push({
            id: String(item._id || item.id || `inv_${Math.random()}`),
            type: 'income',
            amount: Number(item.totalAmount || item.outstandingAmount || item.currentCharge || 0),
            currency: 'INR',
            date: item.createdAt || item.dueDate || null,
            description: item.invoiceNumber ? `Invoice #${item.invoiceNumber}` : 'Maintenance Dues',
            domain: 'INVOICE',
            status: String(item.status || 'UNPAID').toUpperCase(),
            referenceId: item._id ? String(item._id) : null,
            referenceType: 'Invoice',
            paymentMethod: null,
            receiptNumber: null,
            vendorName: null,
            category: 'Maintenance',
            isDeposit: false,
          });
        });
      }

      // Sort by date descending
      items.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      });

      // Filter by type
      let filtered = items;
      if (params.type && params.type !== 'all') {
        filtered = filtered.filter((t) => t.type === params.type);
      }

      // Filter by domain
      if (params.domain && params.domain !== 'ALL') {
        filtered = filtered.filter((t) => t.domain === params.domain);
      }

      // Filter by status
      if (params.status && params.status !== 'ALL') {
        filtered = filtered.filter((t) => t.status === params.status);
      }

      // Filter by search
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.description.toLowerCase().includes(q) ||
            t.domain.toLowerCase().includes(q) ||
            t.status.toLowerCase().includes(q) ||
            (t.vendorName && t.vendorName.toLowerCase().includes(q))
        );
      }

      const page = params.page || 1;
      const limit = params.limit || 15;
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);

      return {
        transactions: paginated,
        page,
        limit,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      };
    } catch {
      const page = params.page || 1;
      const limit = params.limit || 15;
      return {
        transactions: [],
        page,
        limit,
        total: 0,
        totalPages: 1,
      };
    }
  }

  /**
   * Fetch all transactions matching active filters for CSV / Excel export.
   * Traverses pages in batches of 100 up to a safety cap (2000 records).
   */
  async fetchAllFilteredTransactions(params: {
    type?: 'all' | 'income' | 'expense';
    domain?: string;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    search?: string;
    timezone?: string;
    includeLiabilities?: boolean;
  }): Promise<NormalizedTransaction[]> {
    const limit = 100; // Maximum allowed by backend validator
    let page = 1;
    let accumulated: NormalizedTransaction[] = [];
    let hasMore = true;

    while (hasMore && accumulated.length < 2000) {
      const response = await this.fetchTransactions({
        ...params,
        page,
        limit,
      });

      const records = response?.transactions || [];
      accumulated = [...accumulated, ...records];

      const pageLimit = response?.limit || limit;
      if (
        records.length === 0 ||
        records.length < pageLimit ||
        (response?.totalPages && page >= response.totalPages) ||
        (response?.total && accumulated.length >= response.total)
      ) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return accumulated;
  }

  /**
   * Request server-generated report export in CSV, Excel (.xlsx), or PDF format
   */
  async exportReport(params: {
    format: ExportFormat;
    filters: {
      type?: 'all' | 'income' | 'expense';
      domain?: string;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
      search?: string;
      timezone?: string;
      period?: string;
      includeLiabilities?: boolean;
    };
  }): Promise<{
    data: any;
    fileName: string;
    format: ExportFormat;
    rowCount: number;
    totalMatching: number;
    truncated: boolean;
  }> {
    const cleanFilters: Record<string, any> = {
      timezone: params.filters.timezone || 'Asia/Kolkata',
    };
    if (params.filters.type && params.filters.type !== 'all') cleanFilters.type = params.filters.type;
    if (params.filters.domain && params.filters.domain !== 'ALL') cleanFilters.domain = params.filters.domain;
    if (params.filters.status) cleanFilters.status = params.filters.status;
    if (params.filters.startDate) cleanFilters.startDate = params.filters.startDate;
    if (params.filters.endDate) cleanFilters.endDate = params.filters.endDate;
    if (params.filters.search && params.filters.search.trim()) cleanFilters.search = params.filters.search.trim();
    if (params.filters.period) cleanFilters.period = params.filters.period;
    if (params.filters.includeLiabilities !== undefined) cleanFilters.includeLiabilities = params.filters.includeLiabilities;

    try {
      // rawResponse: the shared client normally unwraps to response.data; exports need the headers too
      const response: any = await apiClient.post(
        '/community-finance/exports',
        {
          format: params.format,
          filters: cleanFilters,
        },
        {
          responseType: params.format === 'csv' ? 'text' : 'blob',
          rawResponse: true,
        } as any
      );

      const disposition = response.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const fileName = match ? match[1] : `NAHOM_Community_Finance_${Date.now()}.${params.format}`;
      const rowCount = Number(response.headers?.['x-export-rows'] || 0);
      const totalMatching = Number(response.headers?.['x-export-total'] || rowCount);
      const truncated = String(response.headers?.['x-export-truncated']) === 'true';

      return {
        data: response.data,
        fileName,
        format: params.format,
        rowCount,
        totalMatching,
        truncated,
      };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Fallback: client-side export generation when /community-finance/exports endpoint is not deployed
        const transactions = await this.fetchAllFilteredTransactions(params.filters);
        const fileName = `Community_Finance_${Date.now()}.${params.format}`;
        const { createTransactionsWorksheet } = await import('../utils/exportTransactionsHelper');
        const XLSX = await import('xlsx');
        const worksheet = createTransactionsWorksheet(transactions);

        if (params.format === 'csv') {
          const csvContent = XLSX.utils.sheet_to_csv(worksheet);
          return {
            data: csvContent,
            fileName,
            format: 'csv',
            rowCount: transactions.length,
            totalMatching: transactions.length,
            truncated: false,
          };
        } else if (params.format === 'xlsx') {
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
          const base64Data = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
          return {
            data: base64Data,
            fileName,
            format: 'xlsx',
            rowCount: transactions.length,
            totalMatching: transactions.length,
            truncated: false,
          };
        }
      }
      throw err;
    }
  }
}

export const communityFinanceService = new CommunityFinanceService();
export default communityFinanceService;
