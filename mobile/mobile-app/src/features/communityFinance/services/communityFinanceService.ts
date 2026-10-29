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
  }
}

export const communityFinanceService = new CommunityFinanceService();
export default communityFinanceService;
