import apiClient from '../../../services/apiClient';

export const fetchMyBookings = async (params = {}) => {
  const response = await apiClient.get('/amenity-bookings/my-bookings', { params });
  return response.data;
};

export const createBooking = async (bookingData) => {
  const response = await apiClient.post('/amenity-bookings', bookingData);
  return response.data;
};

export const createManualBooking = async (bookingData) => {
  const response = await apiClient.post('/amenity-bookings/manual', bookingData);
  return response.data;
};

export const cancelBooking = async (id, reason) => {
  const response = await apiClient.put(`/amenity-bookings/${id}/cancel`, { reason });
  return response.data;
};

export const adminCancelBooking = async (id, reason) => {
  const response = await apiClient.put(`/amenity-bookings/${id}/admin-cancel`, { reason });
  return response.data;
};

export const checkInBooking = async (id) => {
  const response = await apiClient.post(`/amenity-bookings/${id}/checkin`);
  return response.data;
};

export const fetchRecentScans = async () => {
  const response = await apiClient.get('/amenity-bookings/scans/recent');
  return response.data;
};

export const fetchBookingQueue = async (params) => {
  const response = await apiClient.get('/amenity-bookings/queue', { params });
  return response.data;
};

export const fetchAdminCalendar = async (startDate, endDate) => {
  const response = await apiClient.get('/amenity-bookings/admin-calendar', {
    params: { startDate, endDate }
  });
  return response.data;
};
