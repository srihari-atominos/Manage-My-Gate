import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import integrationHubApi, {
  ProviderCatalogItem,
  IntegrationConnection,
} from '../services/integrationHubApi';

export interface IntegrationHubState {
  catalog: ProviderCatalogItem[];
  connections: IntegrationConnection[];
  selectedProvider: string;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    rowsPerPage: number;
  };
}

export const DUMMY_CATALOG: ProviderCatalogItem[] = [
  {
    id: 'stripe',
    name: 'Stripe Payments',
    category: 'Payment Gateway',
    description: 'Credit Card & Online Payment Gateway for resident assessments & maintenance dues.',
    icon: 'CreditCard',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'text', required: true },
      { name: 'webhookSecret', label: 'Webhook Secret', type: 'text', required: true },
    ],
  },
  {
    id: 'razorpay',
    name: 'Razorpay PG',
    category: 'Payment Gateway',
    description: 'UPI, Net Banking & Card Processor for India region community payments.',
    icon: 'Coins',
    fields: [
      { name: 'keyId', label: 'Key ID', type: 'text', required: true },
      { name: 'keySecret', label: 'Key Secret', type: 'password', required: true },
    ],
  },
  {
    id: 'twillio',
    name: 'Twilio SMS',
    category: 'SMS & WhatsApp',
    description: 'Automated SMS alerts for gate visitor approvals and urgent notices.',
    icon: 'MessageSquare',
    fields: [
      { name: 'accountSid', label: 'Account SID', type: 'text', required: true },
      { name: 'authToken', label: 'Auth Token', type: 'password', required: true },
    ],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid Email',
    category: 'Email Dispatch',
    description: 'Transactional email service for resident invite tokens and billing receipts.',
    icon: 'Mail',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
];

export const DUMMY_CONNECTIONS: IntegrationConnection[] = [
  {
    id: 'conn-1',
    provider: 'stripe',
    accountLabel: 'Primary Stripe Live Gateway',
    status: 'connected',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'conn-2',
    provider: 'twillio',
    accountLabel: 'Gate Security SMS Dispatcher',
    status: 'connected',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

const initialState: IntegrationHubState = {
  catalog: DUMMY_CATALOG,
  connections: DUMMY_CONNECTIONS,
  selectedProvider: 'all',
  isLoading: false,
  isSubmitting: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: DUMMY_CONNECTIONS.length,
    rowsPerPage: 20,
  },
};

export const fetchCatalogAsync = createAsyncThunk(
  'integrationHub/fetchCatalog',
  async (_, { rejectWithValue }) => {
    try {
      const catalog = await integrationHubApi.fetchCatalog();
      return catalog;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to load integration catalog'
      );
    }
  }
);

export const fetchConnectionsAsync = createAsyncThunk(
  'integrationHub/fetchConnections',
  async (
    args: { provider?: string; page?: number; limit?: number } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const response = await integrationHubApi.fetchConnections(
        args?.provider,
        args?.page || 1,
        args?.limit || 20
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to load integration connections'
      );
    }
  }
);

export const connectIntegrationAsync = createAsyncThunk(
  'integrationHub/connectIntegration',
  async (
    payload: { provider: string; accountLabel: string; credentials: Record<string, any> },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const result = await integrationHubApi.createConnection(payload);
      dispatch(fetchConnectionsAsync({ page: 1 }));
      return result;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to connect integration'
      );
    }
  }
);

export const updateConnectionLabelAsync = createAsyncThunk(
  'integrationHub/updateConnectionLabel',
  async (payload: { id: string; accountLabel: string }, { rejectWithValue }) => {
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(payload.id)) {
        return { id: payload.id, accountLabel: payload.accountLabel } as any;
      }
      const updated = await integrationHubApi.updateConnectionLabel(
        payload.id,
        payload.accountLabel
      );
      return updated;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update account label'
      );
    }
  }
);

export const deleteConnectionAsync = createAsyncThunk(
  'integrationHub/deleteConnection',
  async (id: string, { rejectWithValue }) => {
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return id;
      }
      await integrationHubApi.deleteConnection(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to disconnect integration'
      );
    }
  }
);

const integrationHubSlice = createSlice({
  name: 'integrationHub',
  initialState,
  reducers: {
    setSelectedProvider(state, action: PayloadAction<string>) {
      state.selectedProvider = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Catalog
      .addCase(fetchCatalogAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCatalogAsync.fulfilled, (state, action: PayloadAction<ProviderCatalogItem[]>) => {
        state.isLoading = false;
        state.catalog = action.payload && action.payload.length > 0 ? action.payload : DUMMY_CATALOG;
      })
      .addCase(fetchCatalogAsync.rejected, (state, action) => {
        state.isLoading = false;
        if (state.catalog.length === 0) state.catalog = DUMMY_CATALOG;
        state.error = action.payload as string;
      })

      // Fetch Connections
      .addCase(fetchConnectionsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConnectionsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const fetchedData = action.payload?.data || [];
        state.connections = fetchedData;
        state.pagination = {
          currentPage: action.payload?.page || 1,
          totalPages: action.payload?.pages || 1,
          totalRecords: action.payload?.total ?? fetchedData.length,
          rowsPerPage: state.pagination.rowsPerPage,
        };
      })
      .addCase(fetchConnectionsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Connect Integration
      .addCase(connectIntegrationAsync.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(connectIntegrationAsync.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(connectIntegrationAsync.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })

      // Update Connection Label
      .addCase(updateConnectionLabelAsync.fulfilled, (state, action) => {
        const index = state.connections.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.connections[index] = action.payload;
        }
      })

      // Delete Connection
      .addCase(deleteConnectionAsync.fulfilled, (state, action: PayloadAction<string>) => {
        state.connections = state.connections.filter((item) => item.id !== action.payload);
        state.pagination.totalRecords = Math.max(0, state.pagination.totalRecords - 1);
      });
  },
});

export const { setSelectedProvider, clearError } = integrationHubSlice.actions;
export default integrationHubSlice.reducer;
