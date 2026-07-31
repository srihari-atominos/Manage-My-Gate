import apiClient from '../../../services/apiClient.js';

const BASE_URL = '/complaints/settings';

export const complaintSettingsService = {
  getSettings: async () => {
    return await apiClient.get(BASE_URL);
  },

  updateSettings: async (data) => {
    return await apiClient.put(BASE_URL, data);
  }
};
