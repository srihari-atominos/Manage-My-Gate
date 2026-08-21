import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import amenityApi from '../services/amenityApi';

export interface WalletTransaction {
  _id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  referenceId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface WalletState {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
  loading: boolean;
  toppingUp: boolean;
  error: string | null;
  successMsg: string | null;
}

const initialState: WalletState = {
  balance: 0,
  currency: 'INR',
  transactions: [],
  loading: false,
  toppingUp: false,
  error: null,
  successMsg: null,
};

export const fetchWalletThunk = createAsyncThunk(
  'wallet/fetchWallet',
  async (_, { rejectWithValue }) => {
    try {
      const response = await amenityApi.getWalletBalance();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch wallet details');
    }
  }
);

export const topUpWalletThunk = createAsyncThunk(
  'wallet/topUpWallet',
  async (amount: number, { rejectWithValue }) => {
    try {
      const response = await amenityApi.topUpWallet(amount);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add funds to digital wallet');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWalletStatus: (state) => {
      state.error = null;
      state.successMsg = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Wallet
      .addCase(fetchWalletThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletThunk.fulfilled, (state, action: any) => {
        state.loading = false;
        const payload = action.payload?.data || action.payload;
        if (payload) {
          state.balance = payload.balance ?? payload.currentBalance ?? state.balance;
          state.currency = payload.currency || 'INR';
          state.transactions = payload.transactions || payload.transactionHistory || payload.ledger || [];
        }
      })
      .addCase(fetchWalletThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch wallet balance';
      })
      // Top Up Wallet
      .addCase(topUpWalletThunk.pending, (state) => {
        state.toppingUp = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(topUpWalletThunk.fulfilled, (state, action: any) => {
        state.toppingUp = false;
        const payload = action.payload?.data || action.payload;
        state.successMsg = 'Wallet successfully topped up!';
        if (payload && typeof payload.balance === 'number') {
          state.balance = payload.balance;
        } else {
          const addedAmount = action.meta.arg;
          state.balance += addedAmount;
        }
        if (payload && payload.transaction) {
          state.transactions.unshift(payload.transaction);
        }
      })
      .addCase(topUpWalletThunk.rejected, (state, action) => {
        state.toppingUp = false;
        state.error = (action.payload as string) || 'Failed to add funds to wallet';
      });
  },
});

export const { clearWalletStatus } = walletSlice.actions;
export default walletSlice.reducer;
