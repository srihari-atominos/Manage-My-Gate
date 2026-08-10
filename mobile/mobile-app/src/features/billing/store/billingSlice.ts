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
  status: 'PAID' | 'UNPAID' | 'VERIFICATION_PENDING' | 'OVERDUE' | 'CANCELLED';
  paymentMethod?: string;
  offlineReference?: string;
  dueDate?: string;
  lineItems?: Array<{ title: string; amount: number; description?: string }>;
  proofUrl?: string;
  notes?: string;
}

export interface BillingKPIs {
  grossDemand: number;
  grossDemandCount: number;
  totalCollected: number;
  inTransitGateway: number;
  totalUnpaidArrears: number;
}

interface BillingState {
  kpis: BillingKPIs;
  activeDues: {
    totalPortfolioDue: number;
    unitBreakdown: any[];
    secondaryCompliance: any[];
  };
  invoicesList: Invoice[];
  selectedInvoice: Invoice | null;
  assessmentTemplates: any[];
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
    fetchDetails: boolean;
    settleInvoice: boolean;
    triggerManual: boolean;
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
  selectedInvoice: null,
  assessmentTemplates: [],
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
    fetchDetails: false,
    settleInvoice: false,
    triggerManual: false,
  },
  error: null,
};

// Async Thunks
export const fetchKPIs = createAsyncThunk(
  'billing/fetchKPIs',
  async (communityId: string, { rejectWithValue }) => {
    try {
      const response = await billingService.getKPIs(communityId);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as BillingKPIs;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch billing KPIs');
    }
  }
);

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

export const fetchInvoiceDetails = createAsyncThunk(
  'billing/fetchInvoiceDetails',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const response = await billingService.getInvoiceDetails(invoiceId);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as Invoice;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch invoice details');
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

export const approveOfflineInvoice = createAsyncThunk(
  'billing/approveOfflineInvoice',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const response = await billingService.approveInvoiceOffline(invoiceId);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to approve offline settlement');
    }
  }
);

export const triggerManualBilling = createAsyncThunk(
  'billing/triggerManualBilling',
  async (
    { assessmentId, billingPeriodString }: { assessmentId: string; billingPeriodString: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await billingService.triggerManualBilling(assessmentId, billingPeriodString);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as any;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to trigger batch invoice generation');
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
    _id: updatedInvoice._id || targetId,
    invoiceNumber: updatedInvoice.invoiceNumber || '—',
    date: updatedInvoice.createdAt ? new Date(updatedInvoice.createdAt).toISOString().split('T')[0] : '',
    amount: updatedInvoice.totalDue || updatedInvoice.amount || 0,
    currency: '₹',
    status: updatedInvoice.status || 'UNPAID',
    paymentMethod: updatedInvoice.paymentMethod || '—',
    offlineReference: updatedInvoice.offlineReference || undefined,
  };

  if (index !== -1) {
    state.invoicesList[index] = { ...state.invoicesList[index], ...mappedInvoice };
  } else {
    state.invoicesList.unshift(mappedInvoice);
  }

  if (state.selectedInvoice && String(state.selectedInvoice._id) === targetId) {
    state.selectedInvoice = { ...state.selectedInvoice, ...mappedInvoice };
  }

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
    syncRealtimeKPIs: (state, action: PayloadAction<Partial<BillingKPIs>>) => {
      state.kpis = { ...state.kpis, ...action.payload };
    },
    setSelectedInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.selectedInvoice = action.payload;
    },
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchKPIs
      .addCase(fetchKPIs.pending, (state) => {
        state.loadingStates.fetchKPIs = true;
        state.error = null;
      })
      .addCase(fetchKPIs.fulfilled, (state, action) => {
        state.loadingStates.fetchKPIs = false;
        state.kpis = action.payload;
      })
      .addCase(fetchKPIs.rejected, (state, action) => {
        state.loadingStates.fetchKPIs = false;
        state.error = (action.payload as string) || 'Failed to fetch KPIs';
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

      // fetchInvoiceDetails
      .addCase(fetchInvoiceDetails.pending, (state) => {
        state.loadingStates.fetchDetails = true;
        state.error = null;
      })
      .addCase(fetchInvoiceDetails.fulfilled, (state, action) => {
        state.loadingStates.fetchDetails = false;
        state.selectedInvoice = action.payload;
      })
      .addCase(fetchInvoiceDetails.rejected, (state, action) => {
        state.loadingStates.fetchDetails = false;
        state.error = (action.payload as string) || 'Failed to fetch invoice details';
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

      // approveOfflineInvoice
      .addCase(approveOfflineInvoice.pending, (state) => {
        state.loadingStates.settleInvoice = true;
        state.error = null;
      })
      .addCase(approveOfflineInvoice.fulfilled, (state, action) => {
        state.loadingStates.settleInvoice = false;
        performInvoiceSync(state, action.payload);
      })
      .addCase(approveOfflineInvoice.rejected, (state, action) => {
        state.loadingStates.settleInvoice = false;
        state.error = (action.payload as string) || 'Failed to approve settlement';
      })

      // triggerManualBilling
      .addCase(triggerManualBilling.pending, (state) => {
        state.loadingStates.triggerManual = true;
        state.error = null;
      })
      .addCase(triggerManualBilling.fulfilled, (state) => {
        state.loadingStates.triggerManual = false;
      })
      .addCase(triggerManualBilling.rejected, (state, action) => {
        state.loadingStates.triggerManual = false;
        state.error = (action.payload as string) || 'Failed to trigger batch billing';
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

export const {
  clearBillingError,
  syncRealtimeInvoice,
  syncRealtimeKPIs,
  setSelectedInvoice,
  clearSelectedInvoice,
} = billingSlice.actions;

export default billingSlice.reducer;
