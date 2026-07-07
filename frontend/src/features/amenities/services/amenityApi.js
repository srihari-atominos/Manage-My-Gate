import apiClient from '../../../services/apiClient.js';

export const amenityApi = {
  fetchAmenities: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiClient.get(`/amenities${queryString ? `?${queryString}` : ''}`);
  },
  fetchAvailableAmenities: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiClient.get(`/amenities/available-slots${queryString ? `?${queryString}` : ''}`);
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
  updateAmenityStatus: async (id, status) => {
    return await apiClient.patch(`/amenities/${id}/status`, { status });
  },
  deleteAmenity: async (id) => {
    return await apiClient.delete(`/amenities/${id}`);
  },
  fetchSlots: async (id, date) => {
    return await apiClient.get(`/amenities/${id}/slots?date=${date}`);
  },
  fetchAllSlots: async (id, date) => {
    return await apiClient.get(`/amenities/${id}/slots/all?date=${date}`);
  },
  fetchMaintenanceList: async () => {
    return await apiClient.get('/amenities/maintenance');
  },
  scheduleMaintenance: async (amenityId, data) => {
    return await apiClient.post(`/amenities/${amenityId}/maintenance`, data);
  },
  updateMaintenance: async (amenityId, maintenanceId, data) => {
    return await apiClient.put(`/amenities/${amenityId}/maintenance/${maintenanceId}`, data);
  },
  deleteMaintenance: async (amenityId, maintenanceId) => {
    return await apiClient.delete(`/amenities/${amenityId}/maintenance/${maintenanceId}`);
  }
};

export default amenityApi;
