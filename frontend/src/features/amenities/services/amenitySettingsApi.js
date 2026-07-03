import apiClient from '../../../services/apiClient';

export const getAmenitySettings = async () => {
  const response = await apiClient.get('/amenities/settings');
  return response.data; // { data }
};

export const updateAmenitySettings = async (settingsData) => {
  const response = await apiClient.put('/amenities/settings', settingsData);
  return response.data; // { data }
};
