import apiClient from '../../../services/apiClient';
import { AssignTechnicianPayload } from '../types';

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

  assignTechnician: async (id: string, data: AssignTechnicianPayload) => {
    return await apiClient.put(`${BASE_URL}/${id}/assign`, data);
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

  acceptAssignment: async (id: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/accept`);
  },

  rejectAssignment: async (id: string, reason: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/reject`, { reason });
  },

  startWork: async (id: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/start-work`);
  },

  pauseWork: async (id: string, reason: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/pause-work`, { reason });
  },

  resumeWork: async (id: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/resume-work`);
  },

  markWorkCompleted: async (id: string, data: { notes?: string; attachments?: string[] }) => {
    return await apiClient.post(`${BASE_URL}/${id}/mark-completed`, data);
  },

  uploadWorkAttachments: async (id: string, attachments: string[]) => {
    return await apiClient.post(`${BASE_URL}/${id}/upload-work`, { attachments });
  },

  addWorkNotes: async (id: string, notes: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/work-notes`, { notes });
  },

  confirmCompletion: async (id: string, payload?: any) => {
    return await apiClient.post(`${BASE_URL}/${id}/confirm`, payload || {});
  },

  getDashboardAnalytics: async (params?: any) => {
    return await apiClient.get(`${BASE_URL}/dashboard/analytics`, { params });
  },

  delete: async (id: string) => {
    return await apiClient.delete(`${BASE_URL}/${id}`);
  },
};

export default complaintService;
