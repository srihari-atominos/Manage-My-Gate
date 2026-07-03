import apiClient from '../../../services/apiClient';

export const simulatePayment = async (paymentId, isSuccess, errorReason = null) => {
  const response = await apiClient.post('/payments/simulate', { paymentId, isSuccess, errorReason });
  return response.data;
};
