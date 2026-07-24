import apiClient from '../../../services/apiClient.js';

export const fetchMyWallet = async () => {
  const response = await apiClient.get('/wallet');
  return response.data; // expects { balance, activePasses, transactionHistory }
};

export const addMoneyToWallet = async (amount, paymentMethod) => {
  const response = await apiClient.post('/wallet/add-money', { amount, paymentMethod });
  return response.data;
};
