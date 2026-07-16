import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import billingService from '../services/billing.service.js';

// Thunks
export const fetchAdminKPIs = createAsyncThunk(
  'billing/fetchAdminKPIs',
  async (communityId, { rejectWithValue }) => {
    try {
      const response = await billingService.getKPIs(communityId);
      const body = response?.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch KPIs');
    }
  }
);

export const fetchMyDues = createAsyncThunk(
  'billing/fetchMyDues',
  async (_, { rejectWithValue }) => {
    try {
      const response = await billingService.getMyDues();
      const body = response?.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch personal dues');
    }
  }
);

export const fetchInvoicesGrid = createAsyncThunk(
  'billing/fetchInvoicesGrid',
  async ({ page, limit, filters }, { rejectWithValue }) => {
    try {
      const response = await billingService.getInvoicesTable(page, limit, filters);
      const body = response?.success !== undefined ? response : response?.data;
      const innerData = body?.data || body;
      return {
        data: Array.isArray(innerData) ? innerData : (innerData?.data || []),
        totalRecords: innerData?.totalRecords || 0,
        currentPage: page || 1,
        limit: limit || 10,
        totalPages: innerData?.totalPages || 1,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch invoices grid');
    }
  }
);

export const executeManualTrigger = createAsyncThunk(
  'billing/executeManualTrigger',
  async ({ assessmentId, billingPeriodString }, { rejectWithValue }) => {
    try {
      const response = await billingService.triggerManualBilling(assessmentId, billingPeriodString);
      const body = response?.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to trigger manual billing');
    }
  }
);

export const submitOfflineSettlement = createAsyncThunk(
  'billing/submitOfflineSettlement',
  async ({ invoiceId, offlineReference, paymentMethod }, { rejectWithValue }) => {
    try {
      const response = await billingService.settleInvoiceOffline(invoiceId, {
        offlineReference,
        paymentMethod,
      });
      const body = response?.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to record offline payment');
    }
  }
);

const initialState = {
  kpis: {
    grossDemand: 0,
    totalCollected: 0,
    inTransitGateway: 0,
    totalUnpaidArrears: 0,
  },
  activeDues: {
    totalPortfolioDue: 0,
    unitBreakdown: [],
    secondaryCompliance: [],
  },
  invoicesList: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10,
  },
  loadingStates: {
    fetchKPIs: false,
    fetchDues: false,
    fetchGrid: false,
    triggerRun: false,
    settleInvoice: false,
  },
  error: null,
};

export const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    clearBillingError: (state) => {
      state.error = null;
    },
    syncRealtimeInvoice: (state, action) => {
      const updatedInvoice = action.payload;
      if (!updatedInvoice) return;

      // 1. Sync invoicesList grid
      const index = state.invoicesList.findIndex((inv) => inv._id === updatedInvoice._id);
      if (index !== -1) {
        state.invoicesList[index] = { ...state.invoicesList[index], ...updatedInvoice };
      }

      // 2. Sync activeDues portfolio (if invoice becomes PAID, remove from active dues)
      if (state.activeDues && state.activeDues.unitBreakdown) {
        const breakdownIndex = state.activeDues.unitBreakdown.findIndex(
          (item) => (item.invoiceId || item._id) === updatedInvoice._id
        );

        if (breakdownIndex !== -1) {
          if (updatedInvoice.status === 'PAID') {
            const removed = state.activeDues.unitBreakdown.splice(breakdownIndex, 1)[0];
            state.activeDues.totalPortfolioDue = Math.max(
              0,
              state.activeDues.totalPortfolioDue - (removed.totalDue || 0)
            );
          } else {
            state.activeDues.unitBreakdown[breakdownIndex] = {
              ...state.activeDues.unitBreakdown[breakdownIndex],
              status: updatedInvoice.status,
              totalDue: updatedInvoice.totalDue,
            };
            // Recalculate total due
            state.activeDues.totalPortfolioDue = state.activeDues.unitBreakdown.reduce(
              (sum, item) => sum + (item.totalDue || 0),
              0
            );
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAdminKPIs
      .addCase(fetchAdminKPIs.pending, (state) => {
        state.loadingStates.fetchKPIs = true;
        state.error = null;
      })
      .addCase(fetchAdminKPIs.fulfilled, (state, action) => {
        state.loadingStates.fetchKPIs = false;
        state.kpis = action.payload || initialState.kpis;
      })
      .addCase(fetchAdminKPIs.rejected, (state, action) => {
        state.loadingStates.fetchKPIs = false;
        state.error = action.payload;
      })

      // fetchMyDues
      .addCase(fetchMyDues.pending, (state) => {
        state.loadingStates.fetchDues = true;
        state.error = null;
      })
      .addCase(fetchMyDues.fulfilled, (state, action) => {
        state.loadingStates.fetchDues = false;
        const duesData = action.payload || {};
        state.activeDues = {
          totalPortfolioDue: duesData.personalDues?.totalPortfolioDue || 0,
          unitBreakdown: duesData.personalDues?.unitBreakdown || [],
          secondaryCompliance: duesData.secondaryCompliance || [],
        };
      })
      .addCase(fetchMyDues.rejected, (state, action) => {
        state.loadingStates.fetchDues = false;
        state.error = action.payload;
      })

      // fetchInvoicesGrid
      .addCase(fetchInvoicesGrid.pending, (state) => {
        state.loadingStates.fetchGrid = true;
        state.error = null;
      })
      .addCase(fetchInvoicesGrid.fulfilled, (state, action) => {
        state.loadingStates.fetchGrid = false;
        state.invoicesList = action.payload.data;
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          totalRecords: action.payload.totalRecords,
          limit: action.payload.limit,
        };
      })
      .addCase(fetchInvoicesGrid.rejected, (state, action) => {
        state.loadingStates.fetchGrid = false;
        state.error = action.payload;
      })

      // executeManualTrigger
      .addCase(executeManualTrigger.pending, (state) => {
        state.loadingStates.triggerRun = true;
        state.error = null;
      })
      .addCase(executeManualTrigger.fulfilled, (state) => {
        state.loadingStates.triggerRun = false;
      })
      .addCase(executeManualTrigger.rejected, (state, action) => {
        state.loadingStates.triggerRun = false;
        state.error = action.payload;
      })

      // submitOfflineSettlement
      .addCase(submitOfflineSettlement.pending, (state) => {
        state.loadingStates.settleInvoice = true;
        state.error = null;
      })
      .addCase(submitOfflineSettlement.fulfilled, (state, action) => {
        state.loadingStates.settleInvoice = false;
        // Sync the updated invoice
        if (action.payload) {
          const updated = action.payload;
          const index = state.invoicesList.findIndex((inv) => inv._id === updated._id);
          if (index !== -1) {
            state.invoicesList[index] = { ...state.invoicesList[index], ...updated };
          }
        }
      })
      .addCase(submitOfflineSettlement.rejected, (state, action) => {
        state.loadingStates.settleInvoice = false;
        state.error = action.payload;
      });
  },
});

export const { clearBillingError, syncRealtimeInvoice } = billingSlice.actions;
export default billingSlice.reducer;
