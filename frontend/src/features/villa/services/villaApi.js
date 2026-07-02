import apiClient from '../../../services/apiClient';

/**
 * Fetches all villas for the active community (paginated).
 */
export const fetchVillas = async ({ page = 1, limit = 12, search = '', block = '', occupancyStatus = '' } = {}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', limit);
  if (search) params.append('search', search);
  if (block) params.append('block', block);
  if (occupancyStatus) params.append('occupancyStatus', occupancyStatus);

  const response = await apiClient.get(`/villas?${params.toString()}`);
  return response.data;
};

/**
 * Fetches a single villa and its onboarded residents.
 */
export const fetchVillaById = async (id) => {
  const response = await apiClient.get(`/villas/${id}`);
  return response.data;
};

/**
 * Creates a single new villa.
 */
export const createVilla = async (villaData) => {
  const response = await apiClient.post('/villas', villaData);
  return response.data;
};

/**
 * Updates an existing villa.
 */
export const updateVilla = async (id, villaData) => {
  const response = await apiClient.put(`/villas/${id}`, villaData);
  return response.data;
};

/**
 * Deletes a villa.
 */
export const deleteVilla = async (id) => {
  await apiClient.delete(`/villas/${id}`);
  return id;
};

/**
 * Batch generates villas (e.g. 54 villas).
 */
export const batchGenerateVillas = async (batchData) => {
  const response = await apiClient.post('/villas/batch-generate', batchData);
  return response.data;
};

/**
 * Fetches community villa occupancy statistics.
 */
export const fetchVillaStats = async () => {
  const response = await apiClient.get('/villas/stats');
  return response.data;
};
