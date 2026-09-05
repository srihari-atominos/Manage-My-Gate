import apiClient from '../../../services/apiClient';

export const login = async (credentials: any) => {
  return await apiClient.post('/auth/login', credentials);
};

export const register = async (userData: any) => {
  return await apiClient.post('/auth/register', userData);
};

export const acceptInvite = async ({ token, password }: any) => {
  return await apiClient.post('/auth/accept-invite', { token, password });
};

export const verifyRegistration = async (email: string, code: string) => {
  return await apiClient.post('/auth/register/verify', { email, code });
};

export const loginWithGoogle = async (payload: any) => {
  const body = typeof payload === 'object' && payload !== null ? payload : { token: payload };
  return await apiClient.post('/auth/google', body);
};

export const loginWithMicrosoft = async (payload: any) => {
  const body = typeof payload === 'object' && payload !== null ? payload : { token: payload };
  return await apiClient.post('/auth/microsoft', body);
};

export const initiatePhoneLogin = async (phone: string) => {
  return await apiClient.post('/auth/login/phone', { phone });
};

export const verifyPhoneLogin = async (phone: string, code: string) => {
  return await apiClient.post('/auth/login/phone/verify', { phone, code });
};

export const initiateEmailOtpLogin = async (email: string) => {
  return await apiClient.post('/auth/login/email-otp', { email });
};

export const verifyEmailOtpLogin = async (email: string, code: string) => {
  return await apiClient.post('/auth/login/email-otp/verify', { email, code });
};

export const forgotPassword = async (identifier: string) => {
  return await apiClient.post('/auth/forgot-password', { identifier });
};

export const verifyResetPasswordOtp = async (identifier: string, code: string) => {
  return await apiClient.post('/auth/forgot-password/verify-otp', { identifier, code });
};

export const resetPassword = async ({ identifier, code, newPassword }: any) => {
  return await apiClient.post('/auth/reset-password', { identifier, code, newPassword });
};

export const logoutApi = async () => {
  return await apiClient.post('/auth/logout');
};

export const fetchSessions = async () => {
  return await apiClient.get('/session');
};

export const revokeSession = async (sessionId: string) => {
  return await apiClient.delete(`/session/${sessionId}`);
};

export const revokeAllSessions = async () => {
  return await apiClient.delete('/session/all');
};

export const switchContext = async (payload: { targetOrgId?: string; targetRole?: string; targetVillaId?: string }) => {
  return await apiClient.post('/auth/switch-context', payload);
};

export default {
  login,
  register,
  verifyRegistration,
  acceptInvite,
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
  switchContext,
};
