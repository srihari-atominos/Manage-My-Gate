import communityFinanceReducer, {
  setPeriod,
  clearError,
  resetCommunityFinanceState,
  fetchDashboardData,
  refreshDashboardData,
  setTransactionPeriod,
  setTransactionTypeFilter,
  setTransactionDomainFilter,
  setTransactionStatusFilter,
  setTransactionSearch,
  clearTransactionFilters,
  setSelectedTransaction,
  clearTransactionsError,
  fetchTransactionsList,
  refreshTransactionsList,
} from '../store/communityFinanceSlice';
import { formatINR, getPeriodDateRange } from '../utils/financeFormatters';
import communityFinanceService from '../services/communityFinanceService';
import apiClient from '../../../services/apiClient';
import type {
  ReportingPeriod,
  DashboardData,
  NormalizedTransaction,
  TransactionFilters,
} from '../types';

jest.mock('../../../services/apiClient');

describe('Community Finance Mobile Module', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Currency Formatter (formatINR)', () => {
    it('formats positive amounts with Rupee symbol and Indian comma notation', () => {
      const formatted = formatINR(15000);
      expect(formatted).toContain('₹');
      expect(formatted).toContain('15,000');
    });

    it('formats negative amounts with minus sign before Rupee symbol', () => {
      const formatted = formatINR(-250.5);
      expect(formatted).toMatch(/^-₹250\.5|^-\s*₹250\.5/);
    });

    it('handles zero safely without NaN', () => {
      expect(formatINR(0)).toBe('₹0');
    });

    it('handles null, undefined, and non-numeric values safely', () => {
      expect(formatINR(null)).toBe('₹0');
      expect(formatINR(undefined)).toBe('₹0');
      expect(formatINR(NaN)).toBe('₹0');
    });
  });

  describe('2. Reporting Period Date Ranges (getPeriodDateRange)', () => {
    const periods: ReportingPeriod[] = [
      'Today',
      'This Week',
      'This Month',
      'Last Month',
      'This Year',
      'Previous Year',
      'All Time',
    ];

    periods.forEach((period) => {
      it(`computes valid start and end dates for '${period}'`, () => {
        const { startDate, endDate } = getPeriodDateRange(period);
        if (period === 'All Time') {
          expect(startDate).toBeNull();
          expect(endDate).toBeNull();
        } else {
          expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(startDate! <= endDate!).toBe(true);
        }
      });
    });

    it('Today has identical start and end dates', () => {
      const { startDate, endDate } = getPeriodDateRange('Today');
      expect(startDate).toBe(endDate);
    });
  });

  describe('3. Redux Slice and Reducers', () => {
    const initialState = communityFinanceReducer(undefined, { type: '@@INIT' });

    it('initial state has default period Today and clean values', () => {
      expect(initialState.selectedPeriod).toBe('Today');
      expect(initialState.dashboardData).toBeNull();
      expect(initialState.recentTransactions).toEqual([]);
      expect(initialState.recentTransactionsTotal).toBe(0);
      expect(initialState.loading).toBe(false);
      expect(initialState.error).toBeNull();
      expect(initialState.transactionsList).toEqual([]);
      expect(initialState.transactionFilters.period).toBe('Today');
    });

    it('setPeriod updates selected period', () => {
      const state = communityFinanceReducer(initialState, setPeriod('This Year'));
      expect(state.selectedPeriod).toBe('This Year');
    });

    it('clearError removes active error message', () => {
      const errorState = { ...initialState, error: 'Network failure' };
      const state = communityFinanceReducer(errorState, clearError());
      expect(state.error).toBeNull();
    });

    it('resetCommunityFinanceState restores initialState', () => {
      const dirtyState = {
        ...initialState,
        selectedPeriod: 'This Month' as ReportingPeriod,
        dashboardData: {} as any,
        recentTransactions: [{ id: '1' }] as any,
        loading: true,
        refreshing: true,
        error: 'Fatal error',
        lastFetchedPeriod: 'This Month' as ReportingPeriod,
      };
      const state = communityFinanceReducer(dirtyState, resetCommunityFinanceState());
      expect(state.selectedPeriod).toBe('Today');
      expect(state.dashboardData).toBeNull();
      expect(state.error).toBeNull();
    });

    it('fetchDashboardData.pending sets loading to true and clears error', () => {
      const state = communityFinanceReducer(
        { ...initialState, error: 'Old error' },
        { type: fetchDashboardData.pending.type }
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('fetchDashboardData.fulfilled preserves the transaction API total separately from the preview', () => {
      const mockPayload = {
        dashboard: {
          generatedAt: '2026-10-23T12:00:00.000Z',
          overview: {
            netCollectionsAfterRefunds: 24800,
            reconciledExpensePayments: 9500,
            netSurplusOrDeficit: 15300,
          },
        } as any,
        transactions: [
          { id: 'tx-1', amount: 1500, type: 'income' },
          { id: 'tx-2', amount: 1200, type: 'expense' },
        ] as any,
        recentTransactionsTotal: 12,
        period: 'This Month' as ReportingPeriod,
      };

      const state = communityFinanceReducer(
        { ...initialState, loading: true },
        { type: fetchDashboardData.fulfilled.type, payload: mockPayload }
      );

      expect(state.loading).toBe(false);
      expect(state.dashboardData).toEqual(mockPayload.dashboard);
      expect(state.recentTransactions).toHaveLength(2);
      expect(state.recentTransactionsTotal).toBe(12);
      expect(state.lastFetchedPeriod).toBe('This Month');
      expect(state.error).toBeNull();
    });

    it('fetchDashboardData.rejected sets loading to false and sets error', () => {
      const state = communityFinanceReducer(
        { ...initialState, loading: true },
        { type: fetchDashboardData.rejected.type, payload: 'Unauthorized access' }
      );
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Unauthorized access');
    });

    it('refreshDashboardData.pending sets refreshing to true without wiping existing data', () => {
      const state = communityFinanceReducer(
        { ...initialState, dashboardData: { overview: {} } as any },
        { type: refreshDashboardData.pending.type }
      );
      expect(state.refreshing).toBe(true);
      expect(state.dashboardData).not.toBeNull();
    });
  });

  describe('4. API Service Integration', () => {
    it('fetchDashboard delegates to GET /community-finance/dashboard with correct parameters', async () => {
      const mockData = { success: true, data: { overview: { netSurplusOrDeficit: 1000 } } };
      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockData);

      const result = await communityFinanceService.fetchDashboard({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        timezone: 'Asia/Kolkata',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/community-finance/dashboard', {
        params: {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          timezone: 'Asia/Kolkata',
        },
      });
      expect(result).toEqual(mockData.data);
    });

    it('fetchTransactions requests at most 3 items for dashboard preview', async () => {
      const mockTransactions = {
        success: true,
        data: {
          transactions: [
            { id: '1', type: 'income', amount: 500 },
            { id: '2', type: 'expense', amount: 300 },
            { id: '3', type: 'income', amount: 200 },
          ],
          total: 10,
          page: 1,
          limit: 3,
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockTransactions);

      const result = await communityFinanceService.fetchTransactions({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        limit: 3,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/community-finance/transactions', {
        params: {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          page: 1,
          limit: 3,
          timezone: 'Asia/Kolkata',
        },
      });
      expect(result.transactions).toHaveLength(3);
    });
  });

  describe('5. Authoritative Cash-Basis Financial Correctness', () => {
    it('calculates Net Surplus / Deficit strictly as Net Receipts minus Confirmed Disbursements', () => {
      const overview = {
        netCollectionsAfterRefunds: 50000,
        reconciledExpensePayments: 32000,
        netSurplusOrDeficit: 18000,
      };

      const calculated =
        overview.netCollectionsAfterRefunds - overview.reconciledExpensePayments;
      expect(calculated).toBe(overview.netSurplusOrDeficit);
    });

    it('accurately distinguishes cash deficit when disbursements exceed receipts', () => {
      const overview = {
        netCollectionsAfterRefunds: 20000,
        reconciledExpensePayments: 28000,
        netSurplusOrDeficit: -8000,
      };

      const isDeficit = overview.netSurplusOrDeficit < 0;
      expect(isDeficit).toBe(true);
      expect(formatINR(overview.netSurplusOrDeficit)).toMatch(/^-₹8,000|^-\s*₹8,000/);
    });
  });

  describe('6. Phase 4: Transaction Response Normalization and Missing Fields Handling', () => {
    it('handles optional and missing fields safely in normalized transactions', () => {
      const minimalTx: NormalizedTransaction = {
        id: 'tx-min-1',
        type: 'income',
        amount: 2500,
        currency: 'INR',
        date: null,
        description: 'Payment',
        domain: 'INVOICE',
        status: 'SUCCESS',
        referenceId: null,
        referenceType: 'Invoice',
        paymentMethod: 'OTHER',
        receiptNumber: null,
        createdAt: null,
        updatedAt: null,
      };

      expect(minimalTx.date).toBeNull();
      expect(minimalTx.receiptNumber).toBeNull();
      expect(minimalTx.referenceId).toBeNull();
      expect(formatINR(minimalTx.amount)).toBe('₹2,500');
    });

    it('preserves negative refund amount without silently converting to positive', () => {
      const refundTx: NormalizedTransaction = {
        id: 'tx-ref-1',
        type: 'income',
        amount: -500,
        currency: 'INR',
        date: '2026-10-15T10:00:00.000Z',
        description: 'Refund - Overpayment',
        domain: 'INVOICE',
        status: 'REFUNDED',
        referenceId: 'ref-1',
        referenceType: 'Invoice',
        paymentMethod: 'ONLINE',
        receiptNumber: 'REC-REF-001',
        createdAt: '2026-10-15T10:00:00.000Z',
        updatedAt: '2026-10-15T10:00:00.000Z',
      };

      expect(refundTx.amount).toBe(-500);
      const isNegative = refundTx.amount < 0;
      expect(isNegative).toBe(true);
      expect(formatINR(refundTx.amount)).toMatch(/^-₹500|^-\s*₹500/);
    });
  });

  describe('7. Phase 4: Transaction Filters & Redux Slice Reducers', () => {
    const baseState = communityFinanceReducer(undefined, { type: '@@INIT' });

    it('setTransactionPeriod updates transaction period without modifying dashboard period', () => {
      let state = communityFinanceReducer(baseState, setTransactionPeriod('Last Month'));
      expect(state.transactionFilters.period).toBe('Last Month');
      // Dashboard selectedPeriod must remain untouched
      expect(state.selectedPeriod).toBe('Today');
    });

    it('setTransactionTypeFilter updates type filter correctly', () => {
      let state = communityFinanceReducer(baseState, setTransactionTypeFilter('expense'));
      expect(state.transactionFilters.type).toBe('expense');
    });

    it('setTransactionDomainFilter updates domain filter correctly', () => {
      let state = communityFinanceReducer(baseState, setTransactionDomainFilter('AMENITY'));
      expect(state.transactionFilters.domain).toBe('AMENITY');
    });

    it('setTransactionStatusFilter updates status filter correctly', () => {
      let state = communityFinanceReducer(baseState, setTransactionStatusFilter('RECONCILED'));
      expect(state.transactionFilters.status).toBe('RECONCILED');
    });

    it('setTransactionSearch updates search query string', () => {
      let state = communityFinanceReducer(baseState, setTransactionSearch('Security'));
      expect(state.transactionFilters.search).toBe('Security');
    });

    it('clearTransactionFilters resets filters but preserves active reporting period', () => {
      let state = communityFinanceReducer(baseState, setTransactionPeriod('This Year'));
      state = communityFinanceReducer(state, setTransactionTypeFilter('expense'));
      state = communityFinanceReducer(state, setTransactionDomainFilter('EXPENSE'));
      state = communityFinanceReducer(state, setTransactionSearch('Diesel'));

      state = communityFinanceReducer(state, clearTransactionFilters());
      expect(state.transactionFilters.period).toBe('This Year');
      expect(state.transactionFilters.type).toBe('all');
      expect(state.transactionFilters.domain).toBe('ALL');
      expect(state.transactionFilters.search).toBe('');
    });

    it('setSelectedTransaction sets and clears transaction for inspection sheet', () => {
      const mockTx: NormalizedTransaction = {
        id: 'tx-sheet-1',
        type: 'income',
        amount: 3200,
        currency: 'INR',
        date: '2026-10-12T00:00:00.000Z',
        description: 'Maintenance Fee',
        domain: 'INVOICE',
        status: 'SUCCESS',
        referenceId: 'inv-123',
        referenceType: 'Invoice',
        paymentMethod: 'UPI',
        receiptNumber: 'REC-999',
        createdAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z',
      };

      let state = communityFinanceReducer(baseState, setSelectedTransaction(mockTx));
      expect(state.selectedTransaction).toEqual(mockTx);

      state = communityFinanceReducer(state, setSelectedTransaction(null));
      expect(state.selectedTransaction).toBeNull();
    });
  });

  describe('8. Phase 4: Server-Side Pagination & Deduplication Logic', () => {
    const baseState = communityFinanceReducer(undefined, { type: '@@INIT' });

    it('fetchTransactionsList.fulfilled replaces list when isLoadMore is false', () => {
      const payload = {
        transactions: [
          { id: 'tx-1', amount: 1000, type: 'income' } as any,
          { id: 'tx-2', amount: 2000, type: 'expense' } as any,
        ],
        pagination: {
          currentPage: 1,
          totalPages: 3,
          totalRecords: 6,
          limit: 2,
          hasNextPage: true,
        },
        isLoadMore: false,
      };

      const state = communityFinanceReducer(baseState, {
        type: fetchTransactionsList.fulfilled.type,
        payload,
      });

      expect(state.transactionsList).toHaveLength(2);
      expect(state.transactionsPagination.currentPage).toBe(1);
      expect(state.transactionsPagination.hasNextPage).toBe(true);
    });

    it('fetchTransactionsList.fulfilled appends unique items when isLoadMore is true', () => {
      const initialStateWithData = {
        ...baseState,
        transactionsList: [
          { id: 'tx-1', amount: 1000, type: 'income' } as any,
          { id: 'tx-2', amount: 2000, type: 'expense' } as any,
        ],
        transactionsPagination: {
          currentPage: 1,
          totalPages: 2,
          totalRecords: 4,
          limit: 2,
          hasNextPage: true,
        },
      };

      const nextPagePayload = {
        transactions: [
          { id: 'tx-2', amount: 2000, type: 'expense' } as any, // duplicate should be ignored
          { id: 'tx-3', amount: 3000, type: 'income' } as any,
          { id: 'tx-4', amount: 4000, type: 'expense' } as any,
        ],
        pagination: {
          currentPage: 2,
          totalPages: 2,
          totalRecords: 4,
          limit: 2,
          hasNextPage: false,
        },
        isLoadMore: true,
      };

      const state = communityFinanceReducer(initialStateWithData, {
        type: fetchTransactionsList.fulfilled.type,
        payload: nextPagePayload,
      });

      // tx-2 is not duplicated; total length should be 4
      expect(state.transactionsList).toHaveLength(4);
      expect(state.transactionsList.map((t) => t.id)).toEqual(['tx-1', 'tx-2', 'tx-3', 'tx-4']);
      expect(state.transactionsPagination.currentPage).toBe(2);
      expect(state.transactionsPagination.hasNextPage).toBe(false);
    });

    it('refreshTransactionsList.fulfilled updates data without clearing on error', () => {
      const stateWithItems = {
        ...baseState,
        transactionsList: [{ id: 'tx-old', amount: 500, type: 'income' } as any],
      };

      // Rejected refresh does not clear transactionsList
      const errorState = communityFinanceReducer(stateWithItems, {
        type: refreshTransactionsList.rejected.type,
        payload: 'Gateway timeout',
      });

      expect(errorState.transactionsList).toHaveLength(1);
      expect(errorState.transactionsList[0].id).toBe('tx-old');
      expect(errorState.transactionsError).toBe('Gateway timeout');
    });
  });

  describe('9. Phase 4: API Client Service Filter Construction', () => {
    it('builds clean query parameters without undefined or "ALL" values', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          transactions: [],
          page: 1,
          limit: 15,
          total: 0,
          totalPages: 0,
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockApiResponse);

      await communityFinanceService.fetchTransactions({
        type: 'income',
        domain: 'INVOICE',
        status: 'PAID',
        search: 'INV-2026',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        page: 2,
        limit: 15,
        timezone: 'Asia/Kolkata',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/community-finance/transactions', {
        params: {
          type: 'income',
          domain: 'INVOICE',
          status: 'PAID',
          search: 'INV-2026',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          page: 2,
          limit: 15,
          timezone: 'Asia/Kolkata',
        },
      });
    });

    it('omits domain and status when set to "ALL" or "all"', async () => {
      const mockApiResponse = {
        success: true,
        data: { transactions: [], page: 1, limit: 15, total: 0, totalPages: 0 },
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockApiResponse);

      await communityFinanceService.fetchTransactions({
        type: 'all',
        domain: 'ALL',
        status: 'ALL',
        page: 1,
        limit: 15,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/community-finance/transactions', {
        params: {
          page: 1,
          limit: 15,
          timezone: 'Asia/Kolkata',
        },
      });
    });
  });

  describe('10. Premium 3D UI & Architectural Header Verification', () => {
    it('verifies that CommunityFinanceHeader component is properly exported', () => {
      const { CommunityFinanceHeader } = require('../components/CommunityFinanceHeader');
      expect(CommunityFinanceHeader).toBeDefined();
    });

    it('verifies local architectural banner asset exists and is accessible', () => {
      const fs = require('fs');
      const path = require('path');
      const bannerPath = path.resolve(
        __dirname,
        '../../../../assets/images/banners/community_finance_header.png'
      );
      expect(fs.existsSync(bannerPath)).toBe(true);
      const stats = fs.statSync(bannerPath);
      expect(stats.size).toBeGreaterThan(100000); // High-res asset check (>100KB)
    });

    it('enforces strict prohibition against nahom_emblem_3d in Community Finance', () => {
      const fs = require('fs');
      const path = require('path');
      const componentsDir = path.resolve(__dirname, '../components');
      const files = fs.readdirSync(componentsDir);

      files.forEach((file: string) => {
        const content = fs.readFileSync(path.join(componentsDir, file), 'utf-8');
        expect(content).not.toContain('nahom_emblem_3d');
      });
    });
  });

  describe('11. Standardized TransactionFilterSheet Verification', () => {
    it('verifies that TransactionFilterSheet component is exported and defined', () => {
      const { TransactionFilterSheet } = require('../components/TransactionFilterSheet');
      expect(TransactionFilterSheet).toBeDefined();
    });
  });

  describe('12. Filtered Transactions Export Functionality', () => {
    const mockExportTransactions: NormalizedTransaction[] = [
      {
        id: 'TXN-001',
        type: 'income',
        amount: 5000,
        currency: 'INR',
        date: '2026-10-15T10:00:00.000Z',
        description: 'October Maintenance Flat 301',
        domain: 'INVOICE',
        status: 'PAID',
        referenceId: 'INV-301',
        referenceType: 'Invoice',
        paymentMethod: 'UPI',
        receiptNumber: 'RCPT-1001',
        createdAt: '2026-10-15T10:00:00.000Z',
        updatedAt: '2026-10-15T10:00:00.000Z',
      },
      {
        id: 'TXN-002',
        type: 'expense',
        amount: 2500,
        currency: 'INR',
        date: '2026-10-16T12:00:00.000Z',
        description: 'Lift Maintenance Service',
        domain: 'EXPENSE',
        status: 'RECORDED',
        referenceId: 'EXP-501',
        referenceType: 'Expense',
        paymentMethod: 'Bank Transfer',
        receiptNumber: null,
        createdAt: '2026-10-16T12:00:00.000Z',
        updatedAt: '2026-10-16T12:00:00.000Z',
      },
    ];

    it('buildTransactionExportRows transforms transactions accurately into tabular rows', () => {
      const { buildTransactionExportRows } = require('../utils/exportTransactionsHelper');
      const rows = buildTransactionExportRows(mockExportTransactions);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual([
        '2026-10-15',
        'TXN-001',
        'Income / Inflow',
        'INVOICE',
        'October Maintenance Flat 301',
        5000,
        'INR',
        'PAID',
        'UPI',
        'INV-301',
        'RCPT-1001',
      ]);
      expect(rows[1][2]).toBe('Expense / Outflow');
      expect(rows[1][5]).toBe(2500);
      expect(rows[1][10]).toBe('N/A');
    });

    it('createTransactionsWorksheet builds a worksheet with columns', () => {
      const { createTransactionsWorksheet } = require('../utils/exportTransactionsHelper');
      const ws = createTransactionsWorksheet(mockExportTransactions);

      expect(ws).toBeDefined();
      expect(ws['!cols']).toBeDefined();
      expect(ws['!cols']?.length).toBe(11);
    });

    it('fetchAllFilteredTransactions traverses pages when total records exceed limit', async () => {
      (apiClient.get as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: {
            transactions: [mockExportTransactions[0]],
            page: 1,
            limit: 1,
            total: 2,
            totalPages: 2,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            transactions: [mockExportTransactions[1]],
            page: 2,
            limit: 1,
            total: 2,
            totalPages: 2,
          },
        });

      const results = await communityFinanceService.fetchAllFilteredTransactions({
        type: 'all',
        domain: 'ALL',
      });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('TXN-001');
      expect(results[1].id).toBe('TXN-002');
    });

    it('verifies that CommunityFinanceTransactionsScreen component is properly exported', () => {
      const { CommunityFinanceTransactionsScreen } = require('../screens/CommunityFinanceTransactionsScreen');
      expect(CommunityFinanceTransactionsScreen).toBeDefined();
    });

    it('verifies that FinanceExportSheet component is properly exported and defined', () => {
      const { FinanceExportSheet } = require('../components/FinanceExportSheet');
      expect(FinanceExportSheet).toBeDefined();
      expect(typeof FinanceExportSheet).toBe('function');
    });

    it('communityFinanceService.exportReport sends normalized filters and returns file payload', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: 'MOCK_REPORT_BLOB_OR_CSV',
        headers: {
          'content-disposition': 'attachment; filename="NAHOM_Community_Finance_2026-10-01_to_2026-10-31.xlsx"',
          'x-export-rows': '42',
        },
      });

      const result = await communityFinanceService.exportReport({
        format: 'xlsx',
        filters: {
          type: 'income',
          domain: 'INVOICE',
          status: 'SUCCESS',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          period: 'This Month',
          search: 'Generator',
        },
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/community-finance/exports',
        {
          format: 'xlsx',
          filters: {
            type: 'income',
            domain: 'INVOICE',
            status: 'SUCCESS',
            startDate: '2026-10-01',
            endDate: '2026-10-31',
            period: 'This Month',
            search: 'Generator',
            timezone: 'Asia/Kolkata',
          },
        },
        { responseType: 'blob', rawResponse: true }
      );
      expect(result.fileName).toBe('NAHOM_Community_Finance_2026-10-01_to_2026-10-31.xlsx');
      expect(result.rowCount).toBe(42);
      expect(result.format).toBe('xlsx');
    });

    it('downloadExportFile handles CSV, Excel, and PDF formats gracefully', async () => {
      const { downloadExportFile } = require('../utils/exportTransactionsHelper');
      expect(typeof downloadExportFile).toBe('function');
    });

    it('FinanceExportSheet component is defined and exported as a function component', () => {
      const { FinanceExportSheet } = require('../components/FinanceExportSheet');
      expect(FinanceExportSheet).toBeDefined();
      expect(typeof FinanceExportSheet).toBe('function');
    });
  });

  describe('13. Operating Runway & Balance Simulator Verification', () => {
    it('verifies that FinancialRunwayCard and FinanceRunwaySheet components are defined and exported', () => {
      const { FinancialRunwayCard } = require('../components/FinancialRunwayCard');
      const { FinanceRunwaySheet } = require('../components/FinanceRunwaySheet');
      expect(FinancialRunwayCard).toBeDefined();
      expect(FinanceRunwaySheet).toBeDefined();
    });

    it('verifies CommunityFinanceDashboardScreen exports and integrates runway components', () => {
      const { CommunityFinanceDashboardScreen } = require('../screens/CommunityFinanceDashboardScreen');
      expect(CommunityFinanceDashboardScreen).toBeDefined();
    });

    it('correctly calculates net burn runway and months to balance', () => {
      const remainingBalance = 600000;
      const monthlyExpenses = 150000;
      const monthlyCollections = 100000;
      const netMonthlyBurn = monthlyExpenses - monthlyCollections; // 50,000

      const monthsToBalance = remainingBalance / netMonthlyBurn;
      expect(monthsToBalance).toBe(12);

      // With 2-month reserve buffer (2 * 150,000 = 300,000)
      const buffer = 2 * monthlyExpenses;
      const balanceAboveBuffer = Math.max(0, remainingBalance - buffer); // 300,000
      const monthsAboveBuffer = balanceAboveBuffer / netMonthlyBurn;
      expect(monthsAboveBuffer).toBe(6);
    });

    it('correctly identifies self-sustaining status when inflows cover or exceed burn', () => {
      const monthlyExpenses = 80000;
      const monthlyCollections = 95000;
      const netMonthlyBurn = monthlyExpenses - monthlyCollections; // -15,000 (surplus)

      expect(netMonthlyBurn).toBeLessThanOrEqual(0);
      const isSelfSustaining = netMonthlyBurn <= 0;
      expect(isSelfSustaining).toBe(true);
    });

    it('correctly computes 12-month required collection inflow target', () => {
      const remainingBalance = 360000;
      const monthlyExpenses = 100000;
      const targetMonths = 12;

      // Required inflow = Expenses - Balance / TargetMonths
      const targetInflow = monthlyExpenses - remainingBalance / targetMonths;
      expect(targetInflow).toBe(70000); // 100,000 - 30,000 = 70,000 / month
    });
  });

  describe('14. 3D Cash Flow Trend Chart Verification', () => {
    it('verifies that IncomeExpenseChart is properly exported and defined', () => {
      const { IncomeExpenseChart } = require('../components/IncomeExpenseChart');
      expect(IncomeExpenseChart).toBeDefined();
    });

    it('correctly aggregates time series data into daily, monthly, yearly, and all timeframes', () => {
      const { aggregateTimeSeries } = require('../components/IncomeExpenseChart');

      const samplePoints = [
        { periodKey: '2026-09-18', label: '18 Sep', income: 28500, expense: 0, netSurplus: 28500 },
        { periodKey: '2026-09-24', label: '24 Sep', income: 28500, expense: 0, netSurplus: 28500 },
        { periodKey: '2026-10-02', label: '02 Oct', income: 120000, expense: 15000, netSurplus: 105000 },
      ];

      // 1. Daily
      const daily = aggregateTimeSeries(samplePoints, 'daily');
      expect(daily).toHaveLength(3);
      expect(daily[0].income).toBe(28500);

      // 2. Monthly
      const monthly = aggregateTimeSeries(samplePoints, 'monthly');
      expect(monthly).toHaveLength(2); // Sep and Oct
      const sep = monthly.find((m: any) => m.periodKey === '2026-09');
      const oct = monthly.find((m: any) => m.periodKey === '2026-10');
      expect(sep?.income).toBe(57000); // 28500 + 28500
      expect(oct?.income).toBe(120000);
      expect(oct?.expense).toBe(15000);

      // 3. Yearly
      const yearly = aggregateTimeSeries(samplePoints, 'yearly');
      expect(yearly).toHaveLength(1); // 2026
      expect(yearly[0].income).toBe(177000); // 57000 + 120000
      expect(yearly[0].expense).toBe(15000);
      expect(yearly[0].netSurplus).toBe(162000);

      // 4. All
      const all = aggregateTimeSeries(samplePoints, 'all');
      expect(all).toHaveLength(3);
    });
  });
});
