import apiClient from '../../../services/apiClient';

export const simulatePayment = async (paymentId, isSuccess, errorReason = null, paymentMethod = 'wallet') => {
  const response = await apiClient.post('/payments/simulate', { paymentId, isSuccess, errorReason, paymentMethod });
  return response.data;
};
