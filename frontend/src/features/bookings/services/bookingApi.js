import apiClient from '../../../utils/apiClient.js';

export const bookingApi = {
  fetchBookings: async (filters = {}) => {
    return await apiClient.get('/bookings', { params: filters });
  },
  fetchBookingById: async (id) => {
    return await apiClient.get(`/bookings/${id}`);
  },
  createBooking: async (data) => {
    return await apiClient.post('/bookings', data);
  },
  updateBookingStatus: async (id, statusData) => {
    return await apiClient.put(`/bookings/${id}/status`, statusData);
  }
};

export default bookingApi;
