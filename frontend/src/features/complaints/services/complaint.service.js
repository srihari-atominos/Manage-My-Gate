import apiClient from '../../../services/apiClient.js';

const BASE_URL = '/complaints';

export const complaintService = {

  getDashboardAnalytics: async (params) => {
    return await apiClient.get(`${BASE_URL}/dashboard/analytics`, { params });
  },

  getCalendarEvents: async (params) => {
    return await apiClient.get(`${BASE_URL}/calendar/events`, { params });
  },

  getAll: async (params) => {
    return await apiClient.get(BASE_URL, { params });
  },

  getById: async (id) => {
    return await apiClient.get(`${BASE_URL}/${id}`);
  },

  create: async (data) => {
    return await apiClient.post(BASE_URL, data);
  },

  uploadAttachments: async (formData) => {
    return await apiClient.post(`${BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  assignTechnician: async (id, data) => {
    return await apiClient.put(`${BASE_URL}/${id}/assign`, data);
  },

  updateStatus: async (id, data) => {
    return await apiClient.put(`${BASE_URL}/${id}/status`, data);
  },

  addComment: async (id, data) => {
    return await apiClient.post(`${BASE_URL}/${id}/comments`, data);
  },

  addFeedback: async (id, data) => {
    return await apiClient.post(`${BASE_URL}/${id}/feedback`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`${BASE_URL}/${id}`);
  },

  acceptAssignment: async (id) => {
    return await apiClient.post(`${BASE_URL}/${id}/accept`);
  },

  rejectAssignment: async (id, reason) => {
    return await apiClient.post(`${BASE_URL}/${id}/reject`, { reason });
  },

  startWork: async (id) => {
    return await apiClient.post(`${BASE_URL}/${id}/start-work`);
  },

  pauseWork: async (id, reason) => {
    return await apiClient.post(`${BASE_URL}/${id}/pause-work`, { reason });
  },

  resumeWork: async (id) => {
    return await apiClient.post(`${BASE_URL}/${id}/resume-work`);
  },

  markCompleted: async (id, data) => {
    return await apiClient.post(`${BASE_URL}/${id}/mark-completed`, data);
  },

  uploadWorkAttachments: async (id, data) => {
    return await apiClient.post(`${BASE_URL}/${id}/upload-work`, data);
  },

  addWorkNotes: async (id, data) => {
    return await apiClient.post(`${BASE_URL}/${id}/work-notes`, data);
  },

  confirmCompletion: async (id, payload) => {
    return await apiClient.post(`${BASE_URL}/${id}/confirm`, payload);
  },
};
