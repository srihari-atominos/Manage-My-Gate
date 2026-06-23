import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import integrationHubService from '../services/integrationHub.service.js';

// Async Thunks

export const getCatalog = createAsyncThunk(
  'integrationHub/getCatalog',
  async (_, { rejectWithValue }) => {
    try {
      const response = await integrationHubService.fetchCatalog();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch catalog'
      );
    }
  }
);

export const getConnections = createAsyncThunk(
  'integrationHub/getConnections',
  async ({ provider, page, limit } = {}, { rejectWithValue }) => {
    try {
      const response = await integrationHubService.fetchConnections(provider, page, limit);
      return response.data; // contains data and pagination metadata
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch connections'
      );
    }
  }
);

export const connectIntegration = createAsyncThunk(
  'integrationHub/connectIntegration',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await integrationHubService.createConnection(payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to connect integration'
      );
    }
  }
);

export const updateLabel = createAsyncThunk(
  'integrationHub/updateLabel',
  async ({ id, accountLabel }, { rejectWithValue }) => {
    try {
      const response = await integrationHubService.updateConnectionLabel(id, accountLabel);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update label'
      );
    }
  }
);

export const disconnectIntegration = createAsyncThunk(
  'integrationHub/disconnectIntegration',
  async (id, { rejectWithValue }) => {
    try {
      await integrationHubService.deleteConnection(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to disconnect integration'
      );
    }
  }
);

const initialState = {
  catalog: [],
  connections: [
    { id: '1', _id: '1', provider: 'twilio', accountLabel: 'Twilio US Prod', status: 'connected', createdAt: '2026-06-17T10:00:00.000Z' },
    { id: '2', _id: '2', provider: 'twilio', accountLabel: 'Twilio EU Dev', status: 'connected', createdAt: '2026-06-17T10:05:00.000Z' },
    { id: '3', _id: '3', provider: 'openai', accountLabel: 'GPT-4 Marketing', status: 'connected', createdAt: '2026-06-17T10:10:00.000Z' },
    { id: '4', _id: '4', provider: 'openai', accountLabel: 'DALL-E Core API', status: 'connected', createdAt: '2026-06-17T10:15:00.000Z' },
    { id: '5', _id: '5', provider: 'sendgrid', accountLabel: 'SendGrid Transactional', status: 'connected', createdAt: '2026-06-17T10:20:00.000Z' },
    { id: '6', _id: '6', provider: 'stripe', accountLabel: 'Stripe Live Payments', status: 'connected', createdAt: '2026-06-17T10:25:00.000Z' },
  ],
  pagination: {
    totalRecords: 6,
    currentPage: 1,
    totalPages: 1,
    limit: 10,
  },
  isLoading: false,
  error: null,
};

export const integrationHubSlice = createSlice({
  name: 'integrationHub',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getCatalog
      .addCase(getCatalog.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCatalog.fulfilled, (state, action) => {
        state.isLoading = false;
        state.catalog = action.payload || [];
      })
      .addCase(getCatalog.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // getConnections
      .addCase(getConnections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getConnections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.connections = action.payload?.data || [];
        state.pagination = action.payload?.pagination || initialState.pagination;
      })
      .addCase(getConnections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // connectIntegration
      .addCase(connectIntegration.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(connectIntegration.fulfilled, (state, action) => {
        state.isLoading = false;
        state.connections.unshift(action.payload);
      })
      .addCase(connectIntegration.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // updateLabel
      .addCase(updateLabel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateLabel.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.connections.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.connections[index].accountLabel = action.payload.accountLabel;
        }
      })
      .addCase(updateLabel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // disconnectIntegration
      .addCase(disconnectIntegration.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(disconnectIntegration.fulfilled, (state, action) => {
        state.isLoading = false;
        state.connections = state.connections.filter((c) => c.id !== action.payload);
      })
      .addCase(disconnectIntegration.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = integrationHubSlice.actions;
export default integrationHubSlice.reducer;
