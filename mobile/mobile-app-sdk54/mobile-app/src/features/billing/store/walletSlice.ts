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

const initialState: WalletState = {
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
      .addCase(fetchWalletBalance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWalletBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.balance =
            action.payload.balance !== undefined
              ? action.payload.balance
              : typeof action.payload === 'number'
              ? action.payload
              : state.balance;
          state.activePasses = action.payload.activePasses || state.activePasses;
          state.transactionHistory = action.payload.transactionHistory || state.transactionHistory;
        }
      })
      .addCase(fetchWalletBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createWalletRazorpayOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createWalletRazorpayOrder.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createWalletRazorpayOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { syncWalletBalance, clearWalletError } = walletSlice.actions;
export default walletSlice.reducer;
