import apiClient from '../../../services/apiClient.js';

/**
 * Integration Hub API Service
 * 
 * Handles client-server communication using the configured global apiClient.
 */
export const fetchCatalog = async () => {
  return await apiClient.get('/integrations/catalog');
};

/**
 * Fetch user connections with optional provider filtering and pagination.
 * @param {string} [provider] - Filter by provider name
 * @param {number} [page=1] - Current page number
 * @param {number} [limit=10] - Connections per page limit
 */
export const fetchConnections = async (provider, page = 1, limit = 10) => {
  const params = new URLSearchParams();
  if (provider) params.append('provider', provider);
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());

  return await apiClient.get(`/integrations?${params.toString()}`);
};

/**
 * Create/connect a new integration credential set.
 * @param {object} payload - Connection request payload (provider, accountLabel, credentials)
 */
export const createConnection = async (payload) => {
  return await apiClient.post('/integrations/connect', payload);
};

/**
 * Update the account label of a connection.
 * @param {string} id - Connection ObjectId
 * @param {string} accountLabel - The new account label
 */
export const updateConnectionLabel = async (id, accountLabel) => {
  return await apiClient.put(`/integrations/${id}`, { accountLabel });
};

/**
 * Disconnect (delete) an integration connection.
 * @param {string} id - Connection ObjectId to delete
 */
export const deleteConnection = async (id) => {
  return await apiClient.delete(`/integrations/${id}`);
};

export default {
  fetchCatalog,
  fetchConnections,
  createConnection,
  updateConnectionLabel,
  deleteConnection,
};
