import apiClient from '../../../services/apiClient.js'

/**
 * Service to manage organization-related API operations
 */
export const updateOrganizationFeatures = async (orgId, featuresArray) => {
  return await apiClient.patch(
    `/organizations/${orgId}/features`,
    { features: featuresArray },
    { headers: { 'x-organization-id': orgId } }
  )
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

export const fetchOrganizationDetails = async (orgId) => {
  return await apiClient.get(`/organizations/${orgId}`)
}

export const fetchOrganizationUsers = async (
  orgId,
  { page = 1, limit = 10, search = '', role = '', status = '' } = {},
) => {
  return await apiClient.get(`/organizations/${orgId}/users`, {
    params: { page, limit, search, role, status },
  })
}

export const fetchOrganizationUserDetails = async (orgId, userId) => {
  return await apiClient.get(`/organizations/${orgId}/users/${userId}`)
}

export const checkOrganizationName = async (name) => {
  return await apiClient.get('/organizations/check-name', {
    params: { name },
  })
}

export const setupWorkspace = async (workspaceData) => {
  return await apiClient.post('/organizations/setup', workspaceData)
}

export const updateOrganizationOnboardingMode = async (orgId, onboardingMode) => {
  return await apiClient.patch(
    /organizations/${orgId}/onboarding-mode,
    { onboardingMode },
    { headers: { 'x-organization-id': orgId } }
  )
}

export const bulkInviteOrganizationUsers = async (orgId, invitationsData) => {
  const payload = Array.isArray(invitationsData)
    ? { invitations: invitationsData, invitationSource: 'WEB' }
    : { ...invitationsData, invitationSource: 'WEB' }
  return await apiClient.post(
    '/users/bulk-invite',
    payload,
    { headers: { 'x-organization-id': orgId } }
  )
}

export const sendAdminEmailOtp = async (email) => {
  return await apiClient.post('/organizations/verify-email/send-otp', { email })
}

export const verifyAdminEmailOtp = async (email, code) => {
  return await apiClient.post('/organizations/verify-email/verify-otp', { email, code })
}

export default {
  checkOrganizationName,
  setupWorkspace,
  updateOrganizationFeatures,
  updateOrganizationOnboardingMode,
  bulkInviteOrganizationUsers,
  fetchOrganizations,
  updateOrganizationStatus,
  fetchOrganizationDetails,
  fetchOrganizationUsers,
  fetchOrganizationUserDetails,
  sendAdminEmailOtp,
  verifyAdminEmailOtp,
}
