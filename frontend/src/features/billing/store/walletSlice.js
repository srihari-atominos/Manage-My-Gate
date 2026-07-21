import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../../services/apiClient.js';

/**
 * Fetch digital wallet balance and details.
 */
export const fetchWalletBalance = createAsyncThunk(
  'wallet/fetchWalletBalance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/wallet');
      const body = response?.success !== undefined ? response : response?.data;
      return body?.data || body;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch wallet balance'
      );
    }
  }
);

export const createRazorpayOrder = createAsyncThunk(
  'wallet/createRazorpayOrder',
  async ({ amount }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/wallet/create-order', { amount });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create order');
    }
  }
);

export const verifyRazorpayPayment = createAsyncThunk(
  'wallet/verifyRazorpayPayment',
  async (paymentData, { rejectWithValue, dispatch }) => {
    try {
      const response = await apiClient.post('/wallet/verify-payment', paymentData);
      dispatch(fetchWalletBalance());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Payment verification failed');
    }
  }
);

const initialState = {
  balance: 0,
  activePasses: [],
  transactionHistory: [],
  isLoading: false,
  error: null,
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    syncWalletBalance: (state, action) => {
      if (typeof action.payload === 'number') {
        state.balance = action.payload;
      } else if (action.payload && typeof action.payload.balance === 'number') {
        state.balance = action.payload.balance;
      }
    },
    clearWalletError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalletBalance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWalletBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.balance = action.payload.balance !== undefined ? action.payload.balance : (typeof action.payload === 'number' ? action.payload : state.balance);
          state.activePasses = action.payload.activePasses || state.activePasses;
          state.transactionHistory = action.payload.transactionHistory || state.transactionHistory;
        }
      })
      .addCase(fetchWalletBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createRazorpayOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createRazorpayOrder.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createRazorpayOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { syncWalletBalance, clearWalletError } = walletSlice.actions;
export default walletSlice.reducer;
