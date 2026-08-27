import { Workflow } from './automationSlice';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const orchestratorApi = {
  getWorkflows: async (): Promise<Workflow[]> => {
    try {
      // const response = await axios.get(`${API_URL}/automation/workflows`);
      // return response.data;
      
      // Mock data for UI development
      return [];
    } catch (error) {
      console.error('Error fetching workflows', error);
      throw error;
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
