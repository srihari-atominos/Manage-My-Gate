import fromBillingReducer, {
  fetchWalletBalance,
  createWalletRazorpayOrder,
  verifyWalletPayment,
  topUpWalletDirect,
  syncWalletBalance,
  clearWalletError,
} from '../../billing/store/walletSlice';

export type { WalletState } from '../../billing/types';

export interface WalletTransaction {
  _id: string;
  id?: string;
  transactionId?: string;
  type: 'CREDIT' | 'DEBIT' | 'Credit' | 'Debit';
  amount: number;
  description: string;
  referenceId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt: string;
}

import { createAsyncThunk } from '@reduxjs/toolkit';

// Seamless backward-compatible aliases for Amenities components
export const fetchWalletThunk = fetchWalletBalance;
export const topUpWalletThunk = createAsyncThunk(
  'wallet/topUpWalletThunk',
  async (amount: number, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(topUpWalletDirect({ amount })).unwrap();
      return result;
    } catch (err: any) {
      return rejectWithValue(err?.message || err || 'Failed to top up wallet');
    }
  }
);
export const clearWalletStatus = clearWalletError;

export {
  fetchWalletBalance,
  createWalletRazorpayOrder,
  verifyWalletPayment,
  topUpWalletDirect,
  syncWalletBalance,
  clearWalletError,
};

export default fromBillingReducer;
