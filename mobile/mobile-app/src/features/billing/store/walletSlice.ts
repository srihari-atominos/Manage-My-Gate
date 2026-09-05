import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import billingService from '../services/billingService';
import { WalletState } from '../types';




export const fetchWalletBalance = createAsyncThunk(
  'wallet/fetchWalletBalance',
  async (_, { rejectWithValue }) => {
    try {
      const data = await billingService.getWalletBalance();
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch wallet balance'
      );
    }
  }
);

export const createWalletRazorpayOrder = createAsyncThunk(
  'wallet/createWalletRazorpayOrder',
  async ({ amount }: { amount: number }, { rejectWithValue }) => {
    try {
      const data = await billingService.createWalletOrder(amount);
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create order'
      );
    }
  }
);

export const verifyWalletPayment = createAsyncThunk(
  'wallet/verifyWalletPayment',
  async (paymentData: any, { rejectWithValue, dispatch }) => {
    try {
      const data = await billingService.verifyWalletPayment(paymentData);
      dispatch(fetchWalletBalance());
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Payment verification failed'
      );
    }
  }
);

export const topUpWalletDirect = createAsyncThunk(
  'wallet/topUpWalletDirect',
  async ({ amount }: { amount: number }, { rejectWithValue, dispatch }) => {
    try {
      const response: any = await billingService.topUpWalletDirect(amount);
      dispatch(fetchWalletBalance());
      return response?.data || response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to add funds to digital wallet'
      );
    }
  }
);

const initialState: WalletState = {
  balance: 0,
  activePasses: [],
  transactionHistory: [],
  transactions: [],
  isLoading: false,
  loading: false,
  error: null,
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    syncWalletBalance: (state, action: PayloadAction<any>) => {
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
      // Fetch Balance & History
      .addCase(fetchWalletBalance.pending, (state) => {
        state.isLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        if (action.payload) {
          state.balance =
            action.payload.balance !== undefined
              ? action.payload.balance
              : typeof action.payload === 'number'
              ? action.payload
              : state.balance;
          const history = action.payload.transactionHistory || action.payload.transactions || state.transactionHistory || [];
          state.activePasses = action.payload.activePasses || state.activePasses;
          state.transactionHistory = history;
          state.transactions = history;
        }
      })
      .addCase(fetchWalletBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Order
      .addCase(createWalletRazorpayOrder.pending, (state) => {
        state.isLoading = true;
        state.loading = true;
      })
      .addCase(createWalletRazorpayOrder.fulfilled, (state) => {
        state.isLoading = false;
        state.loading = false;
      })
      .addCase(createWalletRazorpayOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        state.error = action.payload as string;
      })
      // Verify Payment
      .addCase(verifyWalletPayment.pending, (state) => {
        state.isLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyWalletPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        const payload = action.payload?.data || action.payload;
        const updatedBalance = payload?.balance ?? payload?.walletBalance;
        if (updatedBalance !== undefined && typeof updatedBalance === 'number') {
          state.balance = updatedBalance;
        }
        if (payload) {
          const newTxn = payload.transaction || payload;
          if (newTxn && (newTxn._id || newTxn.transactionId)) {
            state.transactionHistory = [newTxn, ...(state.transactionHistory || [])];
            state.transactions = state.transactionHistory;
          }
        }
      })
      .addCase(verifyWalletPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        state.error = action.payload as string;
      })
      // Direct Top-up
      .addCase(topUpWalletDirect.pending, (state) => {
        state.isLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(topUpWalletDirect.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        const payload = action.payload?.data || action.payload;
        const updatedBalance = payload?.balance ?? payload?.walletBalance;
        if (updatedBalance !== undefined && typeof updatedBalance === 'number') {
          state.balance = updatedBalance;
        }
        if (payload) {
          const newTxn = payload.transaction || payload;
          if (newTxn && (newTxn._id || newTxn.transactionId)) {
            state.transactionHistory = [newTxn, ...(state.transactionHistory || [])];
            state.transactions = state.transactionHistory;
          }
        }
      })
      .addCase(topUpWalletDirect.rejected, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { syncWalletBalance, clearWalletError } = walletSlice.actions;
export default walletSlice.reducer;
