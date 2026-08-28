import apiClient from '../../../services/apiClient';

export interface FetchAmenitiesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const fetchAmenities = async (params: FetchAmenitiesParams = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);

  return await apiClient.get(`/amenities?${query.toString()}`);
};

export const fetchAmenityById = async (id: string) => {
  return await apiClient.get(`/amenities/${id}`);
};

export const bookAmenity = async (amenityId: string, bookingData: any) => {
  return await apiClient.post(`/amenities/${amenityId}/book`, bookingData);
};

export const fetchMyBookings = async () => {
  return await apiClient.get('/amenities/my-bookings');
};

export default {
  fetchAmenities,
  fetchAmenityById,
  bookAmenity,
  fetchMyBookings,
};
