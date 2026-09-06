import apiClient from '../../../services/apiClient';

export interface FetchVillasParams {
  page?: number;
  limit?: number;
  search?: string;
  blockOrBuilding?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VillaPayload {
  unitNumber: string;
  blockOrBuilding?: string;
  floor?: number | string;
  squareFeetArea?: number | string;
  floorAreaSqFt?: number | string;
  type?: string;
  status?: 'Vacant' | 'Occupied' | 'Under Maintenance';
}

export interface BatchGenerateParams {
  prefix?: string;
  startNumber: number;
  endNumber: number;
  config?: {
    blockOrBuilding?: string;
    type?: string;
    floorAreaSqFt?: number | null;
  };
}

export const fetchVillas = async (params: FetchVillasParams = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.search) query.append('search', params.search);
  if (params.blockOrBuilding) query.append('blockOrBuilding', params.blockOrBuilding);
  if (params.status) query.append('status', params.status);
  if (params.type) query.append('type', params.type);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

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

export const createVilla = async (villaData: VillaPayload) => {
  return await apiClient.post('/villas', villaData);
};

export const updateVilla = async (id: string, villaData: VillaPayload) => {
  return await apiClient.put(`/villas/${id}`, villaData);
};

export const deleteVilla = async (id: string) => {
  return await apiClient.delete(`/villas/${id}`);
};

export const batchGenerateVillas = async (batchData: BatchGenerateParams) => {
  return await apiClient.post('/villas/batch-generate', batchData);
};

export const bulkUploadVillas = async (villas: VillaPayload[]) => {
  return await apiClient.post('/villas/bulk-upload', { villas });
};

export const downloadBulkUploadTemplate = async () => {
  return await apiClient.get('/villas/bulk-upload/template', {
    responseType: 'blob',
  });
};

export const assignExistingUser = async (villaId: string, userId: string, residencyType: string) => {
  return await apiClient.post(`/villas/${villaId}/assign-resident`, {
    userId,
    residencyType,
  });
};

export const setPrimaryResident = async (villaId: string, primaryResidentId: string | null) => {
  return await apiClient.put(`/villas/${villaId}`, {
    primaryResidentId,
  });
};

export const updateResidencyType = async (villaId: string, userId: string, residencyType: string) => {
  return await apiClient.patch(`/villas/${villaId}/residents/${userId}/type`, {
    residencyType,
  });
};

export const removeResident = async (villaId: string, userId: string) => {
  return await apiClient.delete(`/villas/${villaId}/residents/${userId}`);
};

export default {
  fetchVillas,
  fetchVillaBlocks,
  fetchVillaById,
  fetchVillaStats,
  createVilla,
  updateVilla,
  deleteVilla,
  batchGenerateVillas,
  bulkUploadVillas,
  downloadBulkUploadTemplate,
  assignExistingUser,
  updateResidencyType,
  removeResident,
};
