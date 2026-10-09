const legacyAuthRemoved = () => Promise.reject(new Error('This legacy authentication flow has been removed. Use unified OTP or SSO.'));
export const login = legacyAuthRemoved;
export const initiateInvitationOtp = legacyAuthRemoved;
export const verifyInvitationOtp = legacyAuthRemoved;
export const acceptInvite = legacyAuthRemoved;
export const forgotPassword = legacyAuthRemoved;
export const verifyResetPasswordOtp = legacyAuthRemoved;
export const resetPassword = legacyAuthRemoved;
export const acceptSsoInvite = legacyAuthRemoved;

import apiClient from '../../../services/apiClient.js'

/**
 * Authentication and Workspace API Client Service
 */
export const register = async (userData) => {
  return await apiClient.post('/auth/register', userData)
}

export const verifyRegistration = async (email, code) => {
  return await apiClient.post('/auth/register/verify', { email, code })
}

export const validateInvite = async (token) => {
  return await apiClient.get('/auth/validate-invite', { params: { token } })
}

export const rejectInvite = async (payload) => {
  const body = typeof payload === 'string' ? { token: payload } : payload || {}
  return await apiClient.post('/auth/reject-invite', body)
}

export const createWorkspace = async (workspaceData) => {
  return await apiClient.post('/organizations/setup', workspaceData)
}

export const loginWithGoogle = async (payload) => {
  const body = typeof payload === 'object' && payload !== null ? payload : { token: payload }
  return await apiClient.post('/auth/google', body)
}

export const loginWithMicrosoft = async (payload) => {
  const body = typeof payload === 'object' && payload !== null ? payload : { token: payload }
  return await apiClient.post('/auth/microsoft', body)
}

export const initiatePhoneLogin = async (phone) => {
  return await apiClient.post('/auth/login/phone', { phone })
}

export const verifyPhoneLogin = async (phone, code, inviteToken) => {
  return await apiClient.post('/auth/login/phone/verify', { phone, code, inviteToken })
}

export const initiateEmailOtpLogin = async (email) => {
  return await apiClient.post('/auth/login/email-otp', { email })
}

export const verifyEmailOtpLogin = async (email, code, inviteToken) => {
  return await apiClient.post('/auth/login/email-otp/verify', { email, code, inviteToken })
}


export const requestCurrentContactOtp = async () => {
  return await apiClient.post('/users/request-current-contact-otp')
}

export const verifyCurrentContactOtp = async (otp) => {
  return await apiClient.post('/users/verify-current-contact-otp', { otp })
}

export const requestEmailChangeOtp = async (newEmail) => {
  return await apiClient.post('/users/request-email-otp', { newEmail })
}

export const requestPhoneChangeOtp = async (newPhone) => {
  return await apiClient.post('/users/request-phone-otp', { newPhone })
}

export const logoutApi = async () => {
  return await apiClient.post('/auth/logout')
}

export const fetchSessions = async () => {
  return await apiClient.get('/session')
}

export const revokeSession = async (sessionId) => {
  return await apiClient.delete(`/session/${sessionId}`)
}

export const revokeAllSessions = async () => {
  return await apiClient.delete('/session/all')
}

export const emailOtpLogin = async (payload) => {
  return await apiClient.post('/auth/login/email-otp', payload)
}

export const switchContext = async (payload) => {
  return await apiClient.post('/auth/switch-context', payload)
}

export const registerSsoWithOrg = async (payload) => {
  return await apiClient.post('/auth/register-with-org/sso', payload)
}

export const createInviteHandoff = async (payload = {}) => {
  return await apiClient.post('/auth/invite/handoff', payload)
}

export const exchangeInviteHandoff = async (handoffId, deviceInfo = {}) => {
  return await apiClient.post('/auth/invite/handoff/exchange', { handoffId, deviceInfo })
}

export const checkAccountStatus = async (identifier) => {
  return await apiClient.get('/auth/check-account-status', { params: { identifier } })
}

export default {
  requestCurrentContactOtp,
  verifyCurrentContactOtp,
  requestEmailChangeOtp,
  requestPhoneChangeOtp,
  login,
  register,
  verifyRegistration,
  initiateInvitationOtp,
  verifyInvitationOtp,
  validateInvite,
  acceptInvite,
  rejectInvite,
  createWorkspace,
  loginWithGoogle,
  loginWithMicrosoft,
  initiatePhoneLogin,
  verifyPhoneLogin,
  initiateEmailOtpLogin,
  verifyEmailOtpLogin,
  forgotPassword,
  verifyResetPasswordOtp,
  resetPassword,
  logoutApi,
  fetchSessions,
  revokeSession,
  revokeAllSessions,
  emailOtpLogin,
  acceptSsoInvite,
  switchContext,
  registerSsoWithOrg,
  createInviteHandoff,
  exchangeInviteHandoff,
  checkAccountStatus,
}
