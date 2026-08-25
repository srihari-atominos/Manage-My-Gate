import apiClient from '../../../services/apiClient';
import { AssignTechnicianPayload } from '../types';

const BASE_URL = '/complaints';

export const complaintService = {
  getAll: async (params?: any) => {
    return await apiClient.get(BASE_URL, { 
      params: { ...params, _t: new Date().getTime() } 
    });
  },

  getById: async (id: string) => {
    return await apiClient.get(`${BASE_URL}/${id}`, {
      params: { _t: new Date().getTime() }
    });
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

  assignTechnician: async (id: string, data: AssignTechnicianPayload | { technicianId?: string; vendor?: string; notes?: string; isBroadcast?: boolean }) => {
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

  rejectAssignment: async (id: string, reason?: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/reject`, { reason: reason || '' });
  },

  startWork: async (id: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/start-work`);
  },

  pauseWork: async (id: string, reason?: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/pause-work`, { reason: reason || '' });
  },

  resumeWork: async (id: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/resume-work`);
  },

  markWorkCompleted: async (id: string, payload?: any) => {
    return await apiClient.post(`${BASE_URL}/${id}/mark-completed`, payload || {});
  },

  uploadWorkAttachments: async (id: string, data: any) => {
    if (data instanceof FormData) {
      return await apiClient.post(`${BASE_URL}/${id}/upload-work`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return await apiClient.post(`${BASE_URL}/${id}/upload-work`, Array.isArray(data) ? { attachments: data } : data);
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

  getTechnicians: async (params?: any) => {
    return await apiClient.get('/technicians', { params });
  },
};

export default complaintService;
