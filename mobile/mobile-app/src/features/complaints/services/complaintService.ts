import apiClient from '../../../services/apiClient';

const BASE_URL = '/complaints';

export const complaintService = {
  getAll: async (params?: any) => {
    return await apiClient.get(BASE_URL, { params });
  },

  getById: async (id: string) => {
    return await apiClient.get(`${BASE_URL}/${id}`);
  },

  create: async (data: any) => {
    return await apiClient.post(BASE_URL, data);
  },

  uploadAttachments: async (formData: any) => {
    return await apiClient.post(`${BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateStatus: async (id: string, data: any) => {
    return await apiClient.put(`${BASE_URL}/${id}/status`, data);
  },

  addComment: async (id: string, data: any) => {
    return await apiClient.post(`${BASE_URL}/${id}/comments`, data);
  },

  addFeedback: async (id: string, data: any) => {
    return await apiClient.post(`${BASE_URL}/${id}/feedback`, data);
  },

  delete: async (id: string) => {
    return await apiClient.delete(`${BASE_URL}/${id}`);
  },

  confirmCompletion: async (id: string, payload: any) => {
    return await apiClient.post(`${BASE_URL}/${id}/confirm`, payload);
  },
};

export default complaintService;
