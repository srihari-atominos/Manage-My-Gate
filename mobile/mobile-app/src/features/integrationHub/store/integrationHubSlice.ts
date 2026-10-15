import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import integrationHubApi, {
  ProviderCatalogItem,
  IntegrationConnection,
  UpdateConnectionPayload,
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

const initialState: IntegrationHubState = {
  catalog: [],
  connections: [],
  selectedProvider: 'all',
  isLoading: false,
  isSubmitting: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
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

export const updateConnectionAsync = createAsyncThunk(
  'integrationHub/updateConnection',
  async (payload: { id: string; changes: UpdateConnectionPayload }, { rejectWithValue }) => {
    try {
      return await integrationHubApi.updateConnection(payload.id, payload.changes);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update the integration'
      );
    }
  }
);

export const testConnectionAsync = createAsyncThunk(
  'integrationHub/testConnection',
  async (id: string, { rejectWithValue }) => {
    try {
      return await integrationHubApi.testConnection(id);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Could not test the connection'
      );
    }
  }
);

export const deleteConnectionAsync = createAsyncThunk(
  'integrationHub/deleteConnection',
  async (id: string, { rejectWithValue }) => {
    try {
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
        state.catalog = action.payload || [];
      })
      .addCase(fetchCatalogAsync.rejected, (state, action) => {
        // No made-up providers: if the catalog cannot be loaded the screen says so instead.
        state.isLoading = false;
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

      // Update connection (label and/or credentials)
      .addCase(updateConnectionAsync.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateConnectionAsync.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.connections.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.connections[index] = { ...state.connections[index], ...action.payload };
        }
      })
      .addCase(updateConnectionAsync.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })

      // Test connection: store the fresh result on the card
      .addCase(testConnectionAsync.fulfilled, (state, action) => {
        const index = state.connections.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.connections[index] = {
            ...state.connections[index],
            lastCheck: { ok: action.payload.ok, at: action.payload.at, message: action.payload.message },
          };
        }
      })
      .addCase(testConnectionAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Delete Connection
      .addCase(deleteConnectionAsync.fulfilled, (state, action: PayloadAction<string>) => {
        state.connections = state.connections.filter((item) => item.id !== action.payload);
        state.pagination.totalRecords = Math.max(0, state.pagination.totalRecords - 1);
      })
      .addCase(deleteConnectionAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedProvider, clearError } = integrationHubSlice.actions;
export default integrationHubSlice.reducer;
