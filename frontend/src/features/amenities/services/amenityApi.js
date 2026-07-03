import apiClient from '../../../services/apiClient.js';

export const amenityApi = {
  fetchAmenities: async () => {
    return await apiClient.get('/amenities');
  },
  fetchAmenityById: async (id) => {
    return await apiClient.get(`/amenities/${id}`);
  },
  createAmenity: async (data) => {
    return await apiClient.post('/amenities', data);
  },
  updateAmenity: async (id, data) => {
    return await apiClient.put(`/amenities/${id}`, data);
  },
  deleteAmenity: async (id) => {
    return await apiClient.delete(`/amenities/${id}`);
  },
  fetchSlots: async (id, date) => {
    return await apiClient.get(`/amenities/${id}/slots?date=${date}`);
  }
};

export default amenityApi;
