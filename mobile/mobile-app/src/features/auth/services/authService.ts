import { Platform } from 'react-native';
import apiClient from '../../../services/apiClient';

export const login = async (credentials: any) => {
  return await apiClient.post('/auth/login', credentials);
};

export const register = async (userData: any) => {
  return await apiClient.post('/auth/register', userData);
};

export const acceptInvite = async ({ token, email, password }: any) => {
  return await apiClient.post('/auth/accept-invite', { token, email, password });
};

export const acceptSsoInvite = async (payload: {
  inviteToken: string;
  ssoCredential?: string;
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  clientId?: string;
  provider: 'google' | 'microsoft';
}) => {
  return await apiClient.post('/auth/accept-invite/sso', payload);
};

export const rejectInvite = async ({ token, email }: { token: string; email?: string }) => {
  return await apiClient.post('/auth/reject-invite', { token, email });
};

export const validateInvite = async (token: string, email?: string) => {
  const query = new URLSearchParams();
  if (token) query.append('token', token);
  if (email) query.append('email', email);
  return await apiClient.get(`/auth/validate-invite?${query.toString()}`);
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

export const checkOrganizationName = async (name: string) => {
  return await apiClient.get(`/organizations/check-name?name=${encodeURIComponent(name.trim())}`);
};

export const createWorkspace = async (workspaceData: any) => {
  return await apiClient.post('/organizations/setup', workspaceData);
};

export const updateOrganizationFeatures = async (orgId: string, features: string[]) => {
  return await apiClient.patch(`/organizations/${orgId}/features`, { features });
};

export const deleteAccount = async () => {
  return await apiClient.delete('/users/me');
};

export const updateProfile = async (data: any) => {
  let payload = data;
  if (
    data &&
    !(typeof FormData !== 'undefined' && data instanceof FormData) &&
    typeof (data as any)?._parts === 'undefined'
  ) {
    const hasAvatarFile =
      data.avatar &&
      (typeof data.avatar === 'object' ||
        (typeof data.avatar === 'string' &&
          (data.avatar.startsWith('file://') ||
            data.avatar.startsWith('content://') ||
            data.avatar.startsWith('ph://') ||
            data.avatar.startsWith('blob:') ||
            data.avatar.startsWith('data:'))));

    if (hasAvatarFile) {
      const formData = new FormData();
      const keys = Object.keys(data);
      for (const key of keys) {
        if (key === 'avatar') {
          const av = data.avatar;
          if (Platform.OS === 'web') {
            if (typeof File !== 'undefined' && av instanceof File) {
              formData.append('avatar', av, av.name);
            } else if (typeof Blob !== 'undefined' && av instanceof Blob) {
              formData.append('avatar', av, 'avatar.jpg');
            } else if (typeof av === 'string' && (av.startsWith('blob:') || av.startsWith('data:'))) {
              try {
                const res = await fetch(av);
                const blob = await res.blob();
                formData.append('avatar', blob, 'avatar.jpg');
              } catch {
                formData.append('avatar', av);
              }
            } else if (av && av.uri) {
              try {
                const res = await fetch(av.uri);
                const blob = await res.blob();
                formData.append('avatar', blob, av.name || 'avatar.jpg');
              } catch {
                formData.append('avatar', av.uri);
              }
            }
          } else {
            if (typeof av === 'string') {
              const fileName = av.split('/').pop()?.split('?')[0] || 'avatar.jpg';
              const ext = fileName.split('.').pop()?.toLowerCase();
              const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
              formData.append('avatar', {
                uri: av,
                name: fileName,
                type: mimeType,
              } as any);
            } else if (av && av.uri) {
              formData.append('avatar', {
                uri: av.uri,
                name: av.name || 'avatar.jpg',
                type: av.type || 'image/jpeg',
              } as any);
            }
          }
        } else if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, String(data[key]));
        }
      }
      payload = formData;
    }
  }

  return await apiClient.put('/users/profile', payload);
};

export const requestEmailChangeOtp = async (newEmail: string) => {
  return await apiClient.post('/users/request-email-otp', { newEmail });
};

export const exchangeHandoff = async (handoffId: string, deviceInfo?: any) => {
  return await apiClient.post('/auth/invite/handoff/exchange', { handoffId, deviceInfo });
};

export default {
  login,
  register,
  verifyRegistration,
  acceptInvite,
  acceptSsoInvite,
  rejectInvite,
  validateInvite,
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
  deleteAccount,
  updateProfile,
  requestEmailChangeOtp,
  fetchSessions,
  revokeSession,
  revokeAllSessions,
  switchContext,
  checkOrganizationName,
  createWorkspace,
  updateOrganizationFeatures,
  exchangeHandoff,
};
