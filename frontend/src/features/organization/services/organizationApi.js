import apiClient from '../../../services/apiClient.js'

/**
 * Service to manage organization-related API operations
 */
export const updateOrganizationFeatures = async (orgId, featuresArray) => {
  return await apiClient.patch(`/organizations/${orgId}/features`, {
    features: featuresArray,
  })
}

export const fetchOrganizations = async (page = 1, limit = 10) => {
  return await apiClient.get(`/organizations`, {
    params: { page, limit },
  })
}

export const updateOrganizationStatus = async (orgId, status) => {
  return await apiClient.patch(`/organizations/${orgId}/status`, {
    status,
  })
}

export default {
  updateOrganizationFeatures,
  fetchOrganizations,
  updateOrganizationStatus,
}
