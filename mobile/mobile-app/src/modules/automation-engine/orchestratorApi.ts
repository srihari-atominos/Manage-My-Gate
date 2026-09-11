import apiClient, { getApiBaseUrl } from '../../services/apiClient';
import { Workflow } from './automationSlice';

const getUrl = () => getApiBaseUrl();

export const orchestratorApi = {
  getWorkflows: async (): Promise<Workflow[]> => {
    try {
      const response = await apiClient.get<Workflow[]>('/automation/workflows').catch(() => null);
      return response?.data || [];
    } catch (error) {
      return [];
    }
  },
  
  saveWorkflow: async (workflow: Partial<Workflow>): Promise<Workflow> => {
    try {
      // const response = await axios.post(`${API_URL}/automation/workflows`, workflow);
      // return response.data;
      return workflow as Workflow;
    } catch (error) {
      console.error('Error saving workflow', error);
      throw error;
    }
  }
};
