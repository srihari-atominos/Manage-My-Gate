import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import billingService from '../services/billingService';

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  date: string;
  unitNumber?: string;
  targetUser?: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'UNPAID' | 'VERIFICATION_PENDING' | 'OVERDUE';
  paymentMethod?: string;
  offlineReference?: string;
  dueDate?: string;
}

interface BillingState {
  kpis: {
    grossDemand: number;
    grossDemandCount: number;
    totalCollected: number;
    inTransitGateway: number;
    totalUnpaidArrears: number;
  };
  activeDues: {
    totalPortfolioDue: number;
    unitBreakdown: any[];
    secondaryCompliance: any[];
  };
  invoicesList: Invoice[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
  };
  loadingStates: {
    fetchKPIs: boolean;
    fetchDues: boolean;
    fetchGrid: boolean;
    settleInvoice: boolean;
  };
  error: string | null;
}

const initialState: BillingState = {
  kpis: {
    grossDemand: 0,
    grossDemandCount: 0,
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
    settleInvoice: false,
  },
  error: null,
};

// Thunks
export const fetchMyDues = createAsyncThunk(
  'billing/fetchMyDues',
  async (_, { rejectWithValue }) => {
    try {
      const response = await billingService.getMyDues();
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch personal dues');
    }
  }
);

export const fetchInvoicesGrid = createAsyncThunk(
  'billing/fetchInvoicesGrid',
  async ({ page, limit, filters }: { page: number; limit: number; filters?: any }, { rejectWithValue }) => {
    try {
      const response = await billingService.getInvoicesTable(page, limit, filters);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;
      return {
        data: (Array.isArray(innerData) ? innerData : (innerData?.data || [])) as Invoice[],
        totalRecords: innerData?.pagination?.totalRecords || innerData?.totalRecords || 0,
        currentPage: innerData?.pagination?.currentPage || page || 1,
        limit: innerData?.pagination?.limit || limit || 10,
        totalPages: innerData?.pagination?.totalPages || innerData?.totalPages || 1,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch invoices grid');
    }
  }
);

export const submitOfflineSettlement = createAsyncThunk(
  'billing/submitOfflineSettlement',
  async (
    { invoiceId, offlineReference, paymentMethod }: { invoiceId: string; offlineReference: string; paymentMethod: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await billingService.settleInvoiceOffline(invoiceId, {
        offlineReference,
        paymentMethod,
      });
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to record offline payment');
    }
  }
);

export const payWithWallet = createAsyncThunk(
  'billing/payWithWallet',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const response = await billingService.payInvoiceWithWallet(invoiceId);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to pay invoice with wallet');
    }
  }
);

export const verifyRazorpaySignature = createAsyncThunk(
  'billing/verifyRazorpaySignature',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await billingService.verifyRazorpayPayment(payload);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Payment verification failed');
    }
  }
);

const performInvoiceSync = (state: BillingState, updatedInvoice: any) => {
  if (!updatedInvoice) return;

  const targetId = String(updatedInvoice._id || updatedInvoice.id || '');
  const index = state.invoicesList.findIndex((inv) => String(inv._id) === targetId);

  const mappedInvoice: Invoice = {
    _id: updatedInvoice._id,
    invoiceNumber: updatedInvoice.invoiceNumber,
    date: updatedInvoice.createdAt ? new Date(updatedInvoice.createdAt).toISOString().split('T')[0] : '',
    amount: updatedInvoice.totalDue || updatedInvoice.amount || 0,
    currency: '₹',
    status: updatedInvoice.status,
    paymentMethod: updatedInvoice.paymentMethod || '—',
    offlineReference: updatedInvoice.offlineReference || undefined,
  };

  if (index !== -1) {
    state.invoicesList[index] = { ...state.invoicesList[index], ...mappedInvoice };
  } else {
    state.invoicesList.unshift(mappedInvoice);
  }

  // Remove from active dues if settled
  if (updatedInvoice.status === 'PAID') {
    state.activeDues.unitBreakdown = state.activeDues.unitBreakdown.filter(
      (item) => String(item.invoiceId || item._id) !== targetId
    );
  }
};

export const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    clearBillingError: (state) => {
      state.error = null;
    },
    syncRealtimeInvoice: (state, action: PayloadAction<any>) => {
      performInvoiceSync(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
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
        state.error = (action.payload as string) || 'Failed to fetch personal dues';
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
        state.error = (action.payload as string) || 'Failed to fetch invoices';
      })

      // submitOfflineSettlement
      .addCase(submitOfflineSettlement.pending, (state) => {
        state.loadingStates.settleInvoice = true;
        state.error = null;
      })
      .addCase(submitOfflineSettlement.fulfilled, (state, action) => {
        state.loadingStates.settleInvoice = false;
        performInvoiceSync(state, action.payload);
      })
      .addCase(submitOfflineSettlement.rejected, (state, action) => {
        state.loadingStates.settleInvoice = false;
        state.error = (action.payload as string) || 'Failed to settle offline';
      })

      // payWithWallet
      .addCase(payWithWallet.pending, (state) => {
        state.loadingStates.settleInvoice = true;
        state.error = null;
      })
      .addCase(payWithWallet.fulfilled, (state, action) => {
        state.loadingStates.settleInvoice = false;
        if (action.payload?.invoice) {
          performInvoiceSync(state, action.payload.invoice);
        }
      })
      .addCase(payWithWallet.rejected, (state, action) => {
        state.loadingStates.settleInvoice = false;
        state.error = (action.payload as string) || 'Failed to pay with wallet';
      })

      // verifyRazorpaySignature
      .addCase(verifyRazorpaySignature.pending, (state) => {
        state.loadingStates.settleInvoice = true;
        state.error = null;
      })
      .addCase(verifyRazorpaySignature.fulfilled, (state, action) => {
        state.loadingStates.settleInvoice = false;
        if (action.payload?.invoice) {
          performInvoiceSync(state, action.payload.invoice);
        }
      })
      .addCase(verifyRazorpaySignature.rejected, (state, action) => {
        state.loadingStates.settleInvoice = false;
        state.error = (action.payload as string) || 'Payment verification failed';
      });
  },
});

export const { clearBillingError, syncRealtimeInvoice } = billingSlice.actions;
export default billingSlice.reducer;
