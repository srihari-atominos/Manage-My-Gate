import apiClient from '../../../services/apiClient';

export interface FetchVillasParams {
  page?: number;
  limit?: number;
  search?: string;
  blockOrBuilding?: string;
  status?: string;
  type?: string;
}

export const fetchVillas = async (params: FetchVillasParams = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.search) query.append('search', params.search);
  if (params.blockOrBuilding) query.append('blockOrBuilding', params.blockOrBuilding);
  if (params.status) query.append('status', params.status);
  if (params.type) query.append('type', params.type);

  return await apiClient.get(`/villas?${query.toString()}`);
};

export const fetchVillaBlocks = async () => {
  return await apiClient.get('/villas/blocks');
};

export const fetchVillaById = async (id: string) => {
  return await apiClient.get(`/villas/${id}`);
};

export const fetchVillaStats = async () => {
  return await apiClient.get('/villas/stats');
};

export default {
  fetchVillas,
  fetchVillaBlocks,
  fetchVillaById,
  fetchVillaStats,
};
