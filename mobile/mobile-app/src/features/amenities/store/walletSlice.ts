/**
 * Backward compatibility re-export.
 * The authoritative Digital Wallet feature has been decoupled to `@/src/features/wallet`.
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import walletReducer, {
  fetchWalletBalance,
  createWalletRazorpayOrder,
  verifyWalletPayment,
  topUpWalletDirect,
  syncWalletBalance,
  clearWalletError,
} from '../../wallet/store/walletSlice';

export * from '../../wallet/store/walletSlice';
export * from '../../wallet/types';

// Backward-compatible aliases for legacy Amenities components
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

export default walletReducer;
