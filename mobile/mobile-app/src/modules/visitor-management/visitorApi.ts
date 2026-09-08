import apiClient, { getApiBaseUrl } from '../../services/apiClient';
import { Visitor } from './visitorSlice';

const getUrl = () => getApiBaseUrl();

export const visitorApi = {
  getWalkIns: async (): Promise<Visitor[]> => {
    try {
      const response = await apiClient.get<Visitor[]>('/visitors/walk-ins').catch(() => null);
      return response?.data || [];
    } catch (error) {
      return [];
    }
  },
  
  approveVisitor: async (id: string): Promise<boolean> => {
    try {
      // await axios.post(`${API_URL}/visitors/${id}/approve`);
      return true;
    } catch (error) {
      console.error('Error approving visitor', error);
      throw error;
    }
  },
  
  rejectVisitor: async (id: string): Promise<boolean> => {
    try {
      // await axios.post(`${API_URL}/visitors/${id}/reject`);
      return true;
    } catch (error) {
      console.error('Error rejecting visitor', error);
      throw error;
    }
  }
};
