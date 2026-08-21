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

  assignTechnician: async (id: string, data: { technicianId?: string; vendor?: string; notes?: string; isBroadcast?: boolean }) => {
    return await apiClient.put(`${BASE_URL}/${id}/assign`, data);
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

  acceptAssignment: async (id: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/accept`);
  },

  rejectAssignment: async (id: string, reason?: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/reject`, { reason });
  },

  startWork: async (id: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/start-work`);
  },

  pauseWork: async (id: string, reason?: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/pause-work`, { reason });
  },

  resumeWork: async (id: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/resume-work`);
  },

  markWorkCompleted: async (id: string, payload?: any) => {
    return await apiClient.post(`${BASE_URL}/${id}/mark-completed`, payload);
  },

  uploadWorkAttachments: async (id: string, formData: any) => {
    return await apiClient.post(`${BASE_URL}/${id}/upload-work`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  addWorkNotes: async (id: string, notes: string) => {
    return await apiClient.post(`${BASE_URL}/${id}/work-notes`, { notes });
  },

  confirmCompletion: async (id: string, payload: any) => {
    return await apiClient.post(`${BASE_URL}/${id}/confirm`, payload);
  },

  getTechnicians: async (params?: any) => {
    return await apiClient.get('/technicians', { params });
  },
};

export default complaintService;
