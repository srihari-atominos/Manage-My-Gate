import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as platformBillingService from '../services/platformBillingService';

const mockQuotes = [
  { id: 'q1', quoteNumber: 'QT-2026-001', organizationName: 'Sunrise Villas', trialDays: 15, totalAmount: 120500, status: 'TRIAL_ACTIVE' },
  { id: 'q2', quoteNumber: 'QT-2026-002', organizationName: 'Prestige Heights', trialDays: 0, totalAmount: 93409, status: 'ACCEPTED' },
  { id: 'q3', quoteNumber: 'QT-2026-003', organizationName: 'Greenwood Estate', trialDays: 15, totalAmount: 45000, status: 'DRAFT' }
];

const mockOrders = [
  { id: 'o1', orderNumber: 'ORD-2026-101', organizationName: 'Sunrise Villas', createdAt: '2026-08-01T10:00:00Z', status: 'TRIAL_PENDING', orderSnapshot: { planName: 'Starter Tier', totalAmount: 120500 } },
  { id: 'o2', orderNumber: 'ORD-2026-102', organizationName: 'Prestige Heights', createdAt: '2026-08-05T14:30:00Z', status: 'COMPLETED', orderSnapshot: { planName: 'Premium Tier', totalAmount: 93409 } }
];

const mockInvoices = [
  { id: 'inv1', invoiceNumber: 'INV-2026-201', organizationName: 'Prestige Heights', period: 'Aug 2026 - Jul 2027', amount: 93409, status: 'PAID', grandTotal: 93409, invoiceDate: '2026-08-05T10:00:00Z' },
  { id: 'inv2', invoiceNumber: 'INV-2026-202', organizationName: 'Sunrise Villas', period: 'Sep 2026 - Aug 2027', amount: 120500, status: 'DRAFT', grandTotal: 120500, invoiceDate: '2026-08-10T10:00:00Z' }
];

const mockSubscriptions = [
  { id: 'sub1', subscriptionId: 'SUB-2026-301', organizationName: 'Prestige Heights', planName: 'Starter Tier', status: 'ACTIVE', nextBillingDate: '2027-08-05T00:00:00Z' },
  { id: 'sub2', subscriptionId: 'SUB-2026-302', organizationName: 'Sunrise Villas', planName: 'Starter Tier', status: 'TRIAL', nextBillingDate: '2026-08-15T00:00:00Z' }
];

const mockJobs = [
  { id: 'job1', jobId: 'JOB-2026-401', organizationName: 'Sunrise Villas', progress: 100, status: 'COMPLETED' },
  { id: 'job2', jobId: 'JOB-2026-402', organizationName: 'Greenwood Estate', progress: 40, status: 'IN_PROGRESS' }
];

const initialState = {
  activePage: 'dashboard',
  leads: [],
  selectedLeadId: null,
  activeTab: 'Overview',
  isLoading: false,
  error: null,
  pricingPlans: [],
  quotes: [...mockQuotes],
  orders: [...mockOrders],
  invoices: [...mockInvoices],
  subscriptions: [...mockSubscriptions],
  jobs: [...mockJobs]
};

// --- Thunks ---

export const fetchLeadsThunk = createAsyncThunk(
  'platformBilling/fetchLeads',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformBillingService.fetchInquiries();
      // Assume paginated backend response { data, total, page, limit }
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createInquiryThunk = createAsyncThunk(
  'platformBilling/createInquiry',
  async (inquiryData, { rejectWithValue, dispatch }) => {
    try {
      const response = await platformBillingService.createInquiry(inquiryData);
      dispatch(fetchLeadsThunk());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

let mockMasterPricing = [
  { id: '1', name: 'Starter Tier', tier: 'TIER_1', basePrice: 999, perUnit: 0, setupFee: 0, maxDiscount: 0, trialDays: 15, status: 'ACTIVE' },
];

export const fetchMasterPricingThunk = createAsyncThunk(
  'platformBilling/fetchMasterPricing',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise(r => setTimeout(r, 500));
      return { data: [...mockMasterPricing] };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Data is mocked at the top of the file

export const saveMasterPricingThunk = createAsyncThunk(
  'platformBilling/saveMasterPricing',
  async (planData, { rejectWithValue, dispatch }) => {
    try {
      await new Promise(r => setTimeout(r, 500));
      if (planData.id && mockMasterPricing.find(p => p.id === planData.id)) {
        mockMasterPricing = mockMasterPricing.map(p => p.id === planData.id ? { ...p, ...planData } : p);
      } else {
        mockMasterPricing.unshift({ ...planData, id: Date.now().toString() });
      }
      dispatch(fetchMasterPricingThunk());
      return planData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchQuotesThunk = createAsyncThunk(
  'platformBilling/fetchQuotes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformBillingService.fetchQuotes();
      const data = response.data || response;
      return data.length ? data : mockQuotes;
    } catch (error) {
      // Fallback to mock on error
      return mockQuotes;
    }
  }
);

export const generateQuoteThunk = createAsyncThunk(
  'platformBilling/generateQuote',
  async (quoteData, { rejectWithValue, dispatch }) => {
    try {
      const response = await platformBillingService.generateQuoteAndProvision(quoteData);
      
      // Dispatch all thunks so all tables refresh automatically
      dispatch(fetchQuotesThunk());
      dispatch(fetchOrdersThunk());
      dispatch(fetchInvoicesThunk());
      dispatch(fetchSubscriptionsThunk());
      dispatch(fetchJobsThunk());
      
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchOrdersThunk = createAsyncThunk(
  'platformBilling/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformBillingService.fetchOrders();
      const data = response.data || response;
      return data.length ? data : mockOrders;
    } catch (error) {
      return mockOrders;
    }
  }
);

export const fetchInvoicesThunk = createAsyncThunk(
  'platformBilling/fetchInvoices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformBillingService.fetchInvoices();
      const data = response.data || response;
      return data.length ? data : mockInvoices;
    } catch (error) {
      return mockInvoices;
    }
  }
);

export const fetchSubscriptionsThunk = createAsyncThunk(
  'platformBilling/fetchSubscriptions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformBillingService.fetchSubscriptions();
      const data = response.data || response;
      return data.length ? data : mockSubscriptions;
    } catch (error) {
      return mockSubscriptions;
    }
  }
);

export const fetchJobsThunk = createAsyncThunk(
  'platformBilling/fetchJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await platformBillingService.fetchProvisioningJobs();
      const data = response.data || response;
      return data.length ? data : mockJobs;
    } catch (error) {
      return mockJobs;
    }
  }
);

// --- Slice ---

const handlePending = (state) => {
  state.isLoading = true;
  state.error = null;
};

const handleRejected = (state, action) => {
  state.isLoading = false;
  state.error = action.payload || 'An error occurred';
};

const platformBillingSlice = createSlice({
  name: 'platformBilling',
  initialState,
  reducers: {
    setActivePage(state, action) {
      state.activePage = action.payload;
    },
    setSelectedLeadId(state, action) {
      state.selectedLeadId = action.payload;
    },
    setActiveTab(state, action) {
      state.activeTab = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Leads
      .addCase(fetchLeadsThunk.pending, handlePending)
      .addCase(fetchLeadsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads = Array.isArray(action.payload) ? action.payload : action.payload.docs || action.payload.data || [];
        if (state.leads.length > 0 && !state.selectedLeadId) {
          state.selectedLeadId = state.leads[0]._id || state.leads[0].id;
        }
      })
      .addCase(fetchLeadsThunk.rejected, handleRejected)

      // Create Inquiry
      .addCase(createInquiryThunk.pending, handlePending)
      .addCase(createInquiryThunk.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createInquiryThunk.rejected, handleRejected)
            
      // Fetch Master Pricing
      .addCase(fetchMasterPricingThunk.pending, handlePending)
      .addCase(fetchMasterPricingThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pricingPlans = Array.isArray(action.payload) ? action.payload : action.payload.docs || [];
      })
      .addCase(fetchMasterPricingThunk.rejected, handleRejected)

      // Save Master Pricing
      .addCase(saveMasterPricingThunk.pending, handlePending)
      .addCase(saveMasterPricingThunk.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveMasterPricingThunk.rejected, handleRejected)

      // Fetch Quotes
      .addCase(fetchQuotesThunk.pending, handlePending)
      .addCase(fetchQuotesThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quotes = Array.isArray(action.payload) ? action.payload : action.payload.docs || action.payload.data || [];
      })
      .addCase(fetchQuotesThunk.rejected, handleRejected)

      // Generate Quote
      .addCase(generateQuoteThunk.pending, handlePending)
      .addCase(generateQuoteThunk.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(generateQuoteThunk.rejected, handleRejected)

      // Fetch Orders
      .addCase(fetchOrdersThunk.pending, handlePending)
      .addCase(fetchOrdersThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = Array.isArray(action.payload) ? action.payload : action.payload.docs || action.payload.data || [];
      })
      .addCase(fetchOrdersThunk.rejected, handleRejected)

      // Fetch Invoices
      .addCase(fetchInvoicesThunk.pending, handlePending)
      .addCase(fetchInvoicesThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.invoices = Array.isArray(action.payload) ? action.payload : action.payload.docs || action.payload.data || [];
      })
      .addCase(fetchInvoicesThunk.rejected, handleRejected)

      // Fetch Subscriptions
      .addCase(fetchSubscriptionsThunk.pending, handlePending)
      .addCase(fetchSubscriptionsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscriptions = Array.isArray(action.payload) ? action.payload : action.payload.docs || action.payload.data || [];
      })
      .addCase(fetchSubscriptionsThunk.rejected, handleRejected)

      // Fetch Jobs
      .addCase(fetchJobsThunk.pending, handlePending)
      .addCase(fetchJobsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = Array.isArray(action.payload) ? action.payload : action.payload.docs || action.payload.data || [];
      })
      .addCase(fetchJobsThunk.rejected, handleRejected);
  },
});

export const { setSelectedLeadId, setActiveTab, setActivePage } = platformBillingSlice.actions;

export default platformBillingSlice.reducer;
