import apiClient from '../../../services/apiClient';

export interface TechnicianData {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  department: string;
  type: 'In-House Staff' | 'External Vendor';
  status: 'Active' | 'Pending' | 'Inactive';
  specialization?: string;
  whatsappEnabled?: boolean;
  activeJobsCount?: number;
}

const BASE_URL = '/technicians';

export const technicianService = {
  getAll: async (params?: any) => {
    return await apiClient.get(BASE_URL, { params });
  },

  getWorkloadAnalytics: async () => {
    return await apiClient.get(`${BASE_URL}/analytics/workload`);
  },

  getById: async (id: string) => {
    return await apiClient.get(`${BASE_URL}/${id}`);
  },

  create: async (data: TechnicianData) => {
    return await apiClient.post(BASE_URL, data);
  },

  update: async (id: string, data: Partial<TechnicianData>) => {
    return await apiClient.put(`${BASE_URL}/${id}`, data);
  },

  delete: async (id: string) => {
    return await apiClient.delete(`${BASE_URL}/${id}`);
  },
};

export default technicianService;
