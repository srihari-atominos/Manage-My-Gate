import apiClient from '../../../services/apiClient.js';

export const sampleFeatureApi = {
  fetchSamples: async () => {
    return await apiClient.get('/sample');
  },
  
  fetchSampleById: async (id) => {
    return await apiClient.get(`/sample/${id}`);
  },
  
  createSample: async (data) => {
    return await apiClient.post('/sample', data);
  },
  
  updateSample: async (id, data) => {
    return await apiClient.put(`/sample/${id}`, data);
  },
  
  deleteSample: async (id) => {
    return await apiClient.delete(`/sample/${id}`);
  },
};

export default sampleFeatureApi;
