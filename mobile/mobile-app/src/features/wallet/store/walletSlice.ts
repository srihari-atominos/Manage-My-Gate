import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import walletService from '../services/walletService';
import { WalletState, WalletVerificationPayload } from '../types';

export const fetchWalletBalance = createAsyncThunk(
  'wallet/fetchWalletBalance',
  async (_, { rejectWithValue }) => {
    try {
      const data = await walletService.getWalletData();
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
      const data = await walletService.createRechargeOrder(amount);
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create top-up order'
      );
    }
  }
);

export const verifyWalletPayment = createAsyncThunk(
  'wallet/verifyWalletPayment',
  async (paymentData: WalletVerificationPayload, { rejectWithValue, dispatch }) => {
    try {
      const data = await walletService.verifyPayment(paymentData);
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
  async (arg: number | { amount: number }, { rejectWithValue, dispatch }) => {
    try {
      const amount = typeof arg === 'number' ? arg : arg.amount;
      const response: any = await walletService.addMoneyDirect(amount);
      dispatch(fetchWalletBalance());
      return response?.data || response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to add funds to digital wallet'
      );
    }
  }
);

export const payInvoiceWithWalletThunk = createAsyncThunk(
  'wallet/payInvoiceWithWalletThunk',
  async ({ invoiceId, amount }: { invoiceId: string; amount?: number }, { rejectWithValue, dispatch }) => {
    try {
      const response = await walletService.payInvoice(invoiceId, amount);
      dispatch(fetchWalletBalance());
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to settle invoice with wallet'
      );
    }
  }
);

const initialState: WalletState = {
  balance: 0,
  activePasses: [],
  transactionHistory: [],
  transactions: [],
  isPaymentGatewayConfigured: false,
  isMockGateway: false,
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
          const history =
            action.payload.transactionHistory || action.payload.transactions || [];
          state.activePasses = action.payload.activePasses || state.activePasses;
          state.transactionHistory = history;
          state.transactions = history;
          if (action.payload.isPaymentGatewayConfigured !== undefined) {
            state.isPaymentGatewayConfigured = action.payload.isPaymentGatewayConfigured;
          }
          if (action.payload.isMockGateway !== undefined) {
            state.isMockGateway = action.payload.isMockGateway;
          }
        }
      })
      .addCase(fetchWalletBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load wallet data';
      })

      // Top-Up Order Creation
      .addCase(createWalletRazorpayOrder.pending, (state) => {
        state.isLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(createWalletRazorpayOrder.fulfilled, (state) => {
        state.isLoading = false;
        state.loading = false;
      })
      .addCase(createWalletRazorpayOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to create top-up order';
      })

      // Payment Verification
      .addCase(verifyWalletPayment.pending, (state) => {
        state.isLoading = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyWalletPayment.fulfilled, (state) => {
        state.isLoading = false;
        state.loading = false;
      })
      .addCase(verifyWalletPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.loading = false;
        state.error = (action.payload as string) || 'Payment verification failed';
      });
  },
});

export const { syncWalletBalance, clearWalletError } = walletSlice.actions;
export default walletSlice.reducer;
