import apiClient from '../../../services/apiClient.js';

export const fetchMyWallet = async () => {
  const response = await apiClient.get('/wallet');
  return response.data; // expects { balance, activePasses, transactionHistory }
};

export const addMoneyToWallet = async (amount, paymentMethod) => {
  const response = await apiClient.post('/wallet/add-money', { amount, paymentMethod });
  return response.data;
};

export const createWalletRechargeOrder = async (amount) => {
  return await apiClient.post('/wallet/create-order', { amount });
};

export const verifyWalletRechargePayment = async (payload) => {
  return await apiClient.post('/wallet/verify-payment', payload);
};
