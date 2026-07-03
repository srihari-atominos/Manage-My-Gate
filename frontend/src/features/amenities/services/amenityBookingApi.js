import apiClient from '../../../services/apiClient';

export const fetchMyBookings = async () => {
  const response = await apiClient.get('/amenity-bookings/my-bookings');
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

export const cancelBooking = async (id) => {
  const response = await apiClient.put(`/amenity-bookings/${id}/cancel`);
  return response.data;
};

export const checkInBooking = async (id) => {
  const response = await apiClient.post(`/amenity-bookings/${id}/checkin`);
  return response.data;
};

export const fetchBookingQueue = async (params) => {
  const response = await apiClient.get('/amenity-bookings/queue', { params });
  return response.data;
};
