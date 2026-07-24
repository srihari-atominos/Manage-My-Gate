import apiClient from '../../../services/apiClient'

/**
 * Fetches all units for the active community (paginated).
 */
export const fetchVillas = async ({
  page = 1,
  limit = 12,
  search = '',
  blockOrBuilding = '',
  status = '',
  type = '',
} = {}) => {
  const params = new URLSearchParams()
  params.append('page', page)
  params.append('limit', limit)
  if (search) params.append('search', search)
  if (blockOrBuilding) params.append('blockOrBuilding', blockOrBuilding)
  if (status) params.append('status', status)
  if (type) params.append('type', type)

  const response = await apiClient.get(`/villas?${params.toString()}`)
  return response.data
}

/**
 * Fetches all distinct block/building names for the community.
 * Powers the dynamic block filter dropdown.
 */
export const fetchVillaBlocks = async () => {
  const response = await apiClient.get('/villas/blocks')
  return response.data
}

/**
 * Fetches a single unit and its residents.
 */
export const fetchVillaById = async (id) => {
  const response = await apiClient.get(`/villas/${id}`)
  return response.data
}

/**
 * Creates a single new unit.
 */
export const createVilla = async (villaData) => {
  const response = await apiClient.post('/villas', villaData)
  return response.data
}

/**
 * Updates an existing unit.
 */
export const updateVilla = async (id, villaData) => {
  const response = await apiClient.put(`/villas/${id}`, villaData)
  return response.data
}

/**
 * Deletes a unit.
 */
export const deleteVilla = async (id) => {
  await apiClient.delete(`/villas/${id}`)
  return id
}

/**
 * Assigns primary resident to unit.
 */
export const assignPrimaryResident = async (id, residentId) => {
  const response = await apiClient.patch(`/villas/${id}/assign`, { residentId })
  return response.data
}

/**
 * Batch generates units.
 */
export const batchGenerateVillas = async (batchData) => {
  const response = await apiClient.post('/villas/batch-generate', batchData)
  return response.data
}

/**
 * Fetches occupancy stats.
 */
export const fetchVillaStats = async () => {
  const response = await apiClient.get('/villas/stats')
  return response.data
}

/**
 * Bulk uploads units.
 */
export const bulkUploadVillas = async (villas) => {
  const response = await apiClient.post('/villas/bulk-upload', { villas })
  return response.data
}

/**
 * Downloads the Excel template for bulk uploading units.
 */
export const downloadBulkUploadTemplate = async () => {
  const response = await apiClient.get('/villas/bulk-upload/template', {
    responseType: 'blob',
  })
  return response
}

/**
 * Assigns an existing organization user to the unit.
 */
export const assignExistingUser = async (villaId, userId, residencyType) => {
  const response = await apiClient.post(`/villas/${villaId}/assign-resident`, {
    userId,
    residencyType,
  })
  return response.data
}

/**
 * Updates an assigned user's residency type in the unit.
 */
export const updateResidencyType = async (villaId, userId, residencyType) => {
  const response = await apiClient.patch(`/villas/${villaId}/residents/${userId}/type`, {
    residencyType,
  })
  return response.data
}

/**
 * Unassigns/removes a resident from the unit.
 */
export const removeResident = async (villaId, userId) => {
  const response = await apiClient.delete(`/villas/${villaId}/residents/${userId}`)
  return response.data
}

export default {
  fetchVillas,
  fetchVillaBlocks,
  fetchVillaById,
  createVilla,
  updateVilla,
  deleteVilla,
  assignPrimaryResident,
  batchGenerateVillas,
  fetchVillaStats,
  bulkUploadVillas,
  downloadBulkUploadTemplate,
  assignExistingUser,
  updateResidencyType,
  removeResident,
}
