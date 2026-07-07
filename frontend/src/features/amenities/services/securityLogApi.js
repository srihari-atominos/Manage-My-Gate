import apiClient from '../../../services/apiClient';

const BASE_URL = '/security-logs';

export const fetchSecurityLogs = async (params) => {
  const response = await apiClient.get(BASE_URL, { params });
  return response.data;
};

export const fetchDashboardStats = async () => {
  const response = await apiClient.get(`${BASE_URL}/dashboard`);
  return response.data;
};

export const createManualVerification = async (payload) => {
  const response = await apiClient.post(`${BASE_URL}/manual`, payload);
  return response.data;
};
