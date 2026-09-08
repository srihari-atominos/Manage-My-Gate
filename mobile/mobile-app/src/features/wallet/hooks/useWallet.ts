import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchWalletBalance,
  createWalletRazorpayOrder,
  verifyWalletPayment,
  topUpWalletDirect,
  payInvoiceWithWalletThunk,
  clearWalletError,
} from '../store/walletSlice';
import { useWalletSocket } from './useWalletSocket';
import { WalletVerificationPayload } from '../types';

export const useWallet = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Attach silent real-time socket listener
  useWalletSocket();

  const walletState = useSelector((state: RootState) => state.wallet);
  const balance = walletState?.balance || 0;
  const activePasses = walletState?.activePasses || [];
  const transactionHistory =
    walletState?.transactionHistory || (walletState as any)?.transactions || [];
  const isLoading = walletState?.isLoading || (walletState as any)?.loading || false;
  const error = walletState?.error || null;
  const isGatewayReady = walletState?.isPaymentGatewayConfigured === true;

  const loadWallet = useCallback(() => {
    return dispatch(fetchWalletBalance());
  }, [dispatch]);

  const initiateTopUpOrder = useCallback(
    async (amount: number) => {
      return await dispatch(createWalletRazorpayOrder({ amount })).unwrap();
    },
    [dispatch]
  );

  const confirmTopUpPayment = useCallback(
    async (payload: WalletVerificationPayload) => {
      return await dispatch(verifyWalletPayment(payload)).unwrap();
    },
    [dispatch]
  );

  const topUpDirect = useCallback(
    async (amount: number) => {
      return await dispatch(topUpWalletDirect({ amount })).unwrap();
    },
    [dispatch]
  );

  const payInvoice = useCallback(
    async (invoiceId: string, amount?: number) => {
      return await dispatch(payInvoiceWithWalletThunk({ invoiceId, amount })).unwrap();
    },
    [dispatch]
  );

  const dismissError = useCallback(() => {
    dispatch(clearWalletError());
  }, [dispatch]);

  return {
    balance,
    activePasses,
    transactionHistory,
    isLoading,
    error,
    isGatewayReady,
    loadWallet,
    initiateTopUpOrder,
    confirmTopUpPayment,
    topUpDirect,
    payInvoice,
    dismissError,
  };
};

export default useWallet;
