import apiClient from '../../../services/apiClient.js';

const BASE_URL = '/workspace/modules';

export const workspaceApi = {
  getModules: async (params) => {
    const response = await apiClient.get(BASE_URL, { params });
    return response.data;
  },

  getModuleById: async (id) => {
    const response = await apiClient.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  createModule: async (data) => {
    const response = await apiClient.post(BASE_URL, data);
    return response.data;
  },

  updateModule: async (id, data) => {
    const response = await apiClient.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  updateModuleStatus: async (id, status) => {
    const response = await apiClient.patch(`${BASE_URL}/${id}/status`, { status });
    return response.data;
  },

  deleteModule: async (id) => {
    const response = await apiClient.delete(`${BASE_URL}/${id}`);
    return response.data;
  },

  restoreModule: async (id) => {
    const response = await apiClient.patch(`${BASE_URL}/${id}/restore`);
    return response.data;
  },
};
