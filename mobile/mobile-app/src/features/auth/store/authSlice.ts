import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService from '../services/authService';
import storage from '../../../utils/storage';
import { deviceTokenService } from '../../notification/services/deviceTokenService';

export interface User {
  id: string;
  _id?: string;
  email: string;
  username?: string;
  name?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  orgId?: string;
  activeOrgId?: string;
  organizationId?: string;
  organizationName?: string;
  activeOrganizationName?: string;
  orgName?: string;
  permissions?: string[];
  isPlatform?: boolean;
  availableWorkspaces?: any[];
  allowedFeatures?: string[];
  [key: string]: any;
}

export const normalizeUser = (user: any): User | null => {
  if (!user) return null;
  const canonicalId = user.id || user._id || '';
  
  // Recursively extract the actual string ID if an object was passed
  const extractId = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string' && val !== '[object Object]') return val;
    if (typeof val === 'object') return val._id || val.id || '';
    return '';
  };

  const canonicalOrgId =
    extractId(user.orgId) ||
    extractId(user.activeOrgId) ||
    extractId(user.organizationId) ||
    extractId(user.org) ||
    extractId(user.organization) ||
    extractId(user.activeOrganizationId) ||
    (Array.isArray(user.availableWorkspaces) && (extractId(user.availableWorkspaces[0]?.orgId) || extractId(user.availableWorkspaces[0]?._id) || extractId(user.availableWorkspaces[0]?.id))) ||
    '';

  // Find workspace item matching the active organization
  const currentWorkspace = Array.isArray(user.availableWorkspaces)
    ? user.availableWorkspaces.find((w: any) => {
        const wId = extractId(w.orgId) || extractId(w._id) || extractId(w.id);
        return canonicalOrgId && wId ? wId === canonicalOrgId : false;
      })
    : null;

  const orgName =
    user.organizationName ||
    user.orgName ||
    user.activeOrganizationName ||
    user.organization?.name ||
    currentWorkspace?.name || currentWorkspace?.organizationName || currentWorkspace?.orgName || currentWorkspace?.communityOrg ||
    (Array.isArray(user.availableWorkspaces) && user.availableWorkspaces[0] && (user.availableWorkspaces[0].name || user.availableWorkspaces[0].organizationName || user.availableWorkspaces[0].orgName || user.availableWorkspaces[0].communityOrg)) ||
    '';
  const isPlatform =
    user.isPlatform === true ||
    currentWorkspace?.isPlatform === true ||
    (Array.isArray(user.availableWorkspaces) && user.availableWorkspaces.length === 1 && user.availableWorkspaces[0]?.isPlatform === true);

  const effectiveRole = user.role || (Array.isArray(user.roles) && user.roles[0]) || '';
  const isResidentRole = /resident|tenant|owner|family/i.test(effectiveRole);

  // Filter accessibleUnits belonging to the active organization strictly for Resident roles
  const accessibleUnits = isResidentRole && Array.isArray(user.accessibleUnits)
    ? user.accessibleUnits.filter((u: any) => {
        if (!u) return false;
        if (!canonicalOrgId) return true;
        const uOrg = extractId(u.orgId) || extractId(u.organizationId);
        return !uOrg || uOrg === canonicalOrgId;
      })
    : [];

  // Determine villa unit context strictly for the active organization and Resident roles
  let vNum = '';
  let canonicalVillaId = '';

  if (isResidentRole) {
    if (user.villaNumber || user.activeVillaNumber || user.unitNumber || user.villa?.unitNumber) {
      vNum = user.villaNumber || user.activeVillaNumber || user.unitNumber || user.villa?.unitNumber || '';
    } else if (currentWorkspace?.villaNumber || currentWorkspace?.unitNumber) {
      vNum = currentWorkspace.villaNumber || currentWorkspace.unitNumber || '';
    } else if (accessibleUnits.length > 0 && (accessibleUnits[0]?.villaNumber || accessibleUnits[0]?.unitNumber)) {
      vNum = accessibleUnits[0].villaNumber || accessibleUnits[0].unitNumber || '';
    }

    if (extractId(user.activeVillaId) || extractId(user.villaId) || extractId(user.villa?._id) || extractId(user.villa?.id)) {
      canonicalVillaId = extractId(user.activeVillaId) || extractId(user.villaId) || extractId(user.villa?._id) || extractId(user.villa?.id);
    } else if (currentWorkspace?.villaId || currentWorkspace?.unitId) {
      canonicalVillaId = extractId(currentWorkspace.villaId) || extractId(currentWorkspace.unitId);
    } else if (accessibleUnits.length > 0 && extractId(accessibleUnits[0]?.villaId)) {
      canonicalVillaId = extractId(accessibleUnits[0].villaId);
    }
  }

  return {
    ...user,
    id: canonicalId,
    isPlatform,
    _id: canonicalId || user._id,
    orgId: canonicalOrgId,
    activeOrgId: canonicalOrgId,
    orgName,
    organizationName: orgName,
    activeOrganizationName: orgName,
    villaId: isResidentRole ? canonicalVillaId : null,
    activeVillaId: isResidentRole ? canonicalVillaId : null,
    villaNumber: isResidentRole ? vNum : '',
    activeVillaNumber: isResidentRole ? vNum : '',
    unitNumber: isResidentRole ? vNum : '',
    residentType: isResidentRole ? (user.residentType || 'Resident') : 'None',
    activeAssignment: user.activeAssignment || null,
    availableAssignments: user.availableAssignments || [],
    accessibleAssignments: user.accessibleAssignments || {},
    assignedGate: user.assignedGate || '',
    assignedFacility: user.assignedFacility || '',
    accessibleUnits,
    availableWorkspaces: user.availableWorkspaces || [],
    allowedFeatures: user.allowedFeatures || user.organization?.allowedFeatures || [],
  };
};

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  successMsg: string | null;
  otpSent: boolean;
  isInitialized: boolean;
  /** Structured details of the last OTP/invitation error (attempts left, retry time). */
  errorDetail: { code?: string; attemptsRemaining?: number; retryAfterSeconds?: number } | null;
  /** Set when an invitee verified their identity but must pick an invitation to accept. */
  invitationSelection: { ticket: string | null; pendingInvitations: any[] } | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  successMsg: null,
  otpSent: false,
  isInitialized: false,
  errorDetail: null,
  invitationSelection: null,
};

export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrapAuth',
  async (_, { dispatch }) => {
    try {
      const keepSignedIn = await storage.getItem('keep_signed_in');
      if (keepSignedIn === 'false') {
        await storage.removeItem('token');
        await storage.removeItem('refreshToken');
        await storage.removeItem('user');
        return { token: null, refreshToken: null, user: null };
      }

      const token = await storage.getItem('token');
      const refreshToken = await storage.getItem('refreshToken');
      const userStr = await storage.getItem('user');
      let user = null;

      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          console.warn('Corrupted user JSON in storage, clearing key:', e);
          await storage.removeItem('user');
        }
      }

      // If token and user exist in local storage, return immediately to unblock app startup instantly!
      if (token && user) {
        // Sync latest profile & availableWorkspaces asynchronously in background without blocking bootstrap
        (async () => {
          try {
            const savedOrgId = user?.orgId || user?.activeOrgId || user?.organizationId;
            const savedVillaId = user?.activeVillaId || user?.villaId || user?.unitNumber;
            const savedRole = user?.role || user?.activeRole;

            const switchPayload: any = {};
            if (savedOrgId && typeof savedOrgId === 'string' && /^[0-9a-fA-F]{24}$/.test(savedOrgId.trim())) {
              switchPayload.targetOrgId = savedOrgId.trim();
            }
            if (savedVillaId && typeof savedVillaId === 'string' && /^[0-9a-fA-F]{24}$/.test(savedVillaId.trim())) {
              switchPayload.targetVillaId = savedVillaId.trim();
            }
            if (savedRole && typeof savedRole === 'string' && savedRole.trim()) {
              switchPayload.targetRole = savedRole.trim();
            }

            let response;
            try {
              response = await authService.switchContext(switchPayload);
            } catch (syncErr: any) {
              if (syncErr?.message === 'Session expired. Please log in again.' || syncErr?.message?.includes('Network Error')) {
                return;
              }
              console.warn('Target workspace context unavailable or deleted, falling back to default active context:', syncErr?.message);
              try {
                response = await authService.switchContext({});
              } catch (fallbackErr: any) {
                if (fallbackErr?.message !== 'Session expired. Please log in again.') {
                  console.warn('Fallback switchContext failed:', fallbackErr);
                }
              }
            }

            if (response) {
              const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
              const innerData = body?.data || body;
              const freshToken = innerData?.token || token;
              const freshRefreshToken = innerData?.refreshToken || refreshToken;
              const rawUser = innerData?.user;
              const availableWorkspaces = innerData?.availableWorkspaces || rawUser?.availableWorkspaces || [];
              const freshUser = rawUser ? { ...rawUser, availableWorkspaces } : user;

              if (freshToken) await storage.setItem('token', freshToken);
              if (freshRefreshToken) await storage.setItem('refreshToken', freshRefreshToken);
              if (freshUser) await storage.setItem('user', JSON.stringify(freshUser));

              dispatch(
                updateTokenAndUser({
                  token: freshToken,
                  refreshToken: freshRefreshToken,
                  user: freshUser,
                })
              );
            }
          } catch (syncErr) {
            console.warn('Background auth session refresh error:', syncErr);
          }
        })();

        return { token, refreshToken, user };
      }

      // If token exists but user was missing, fetch fresh user context
      if (token) {
        try {
          const response = await authService.switchContext({});
          if (response) {
            const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
            const innerData = body?.data || body;
            const freshToken = innerData?.token || token;
            const freshRefreshToken = innerData?.refreshToken || refreshToken;
            const rawUser = innerData?.user;
            const availableWorkspaces = innerData?.availableWorkspaces || rawUser?.availableWorkspaces || [];
            const freshUser = rawUser ? { ...rawUser, availableWorkspaces } : user;

            if (freshToken) await storage.setItem('token', freshToken);
            if (freshRefreshToken) await storage.setItem('refreshToken', freshRefreshToken);
            if (freshUser) await storage.setItem('user', JSON.stringify(freshUser));

            return { token: freshToken, refreshToken: freshRefreshToken, user: freshUser };
          }
        } catch (syncErr) {
          console.warn('Could not refresh auth session from backend:', syncErr);
        }
      }

      return { token, refreshToken, user };
    } catch (err) {
      console.warn('Error bootstrapping auth state from storage:', err);
      return { token: null, refreshToken: null, user: null };
    }
  }
);


export const registerUserThunk = createAsyncThunk(
  'auth/registerUser',
  async (userData: any, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return body?.data || body;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed');
    }
  }
);

export const verifyRegistrationThunk = createAsyncThunk(
  'auth/verifyRegistration',
  async ({ email, code }: { email: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyRegistration(email, code);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;

      const token = innerData?.token;
      const refreshToken = innerData?.refreshToken;
      const user = innerData?.user;

      if (token) await storage.setItem('token', token);
      if (refreshToken) await storage.setItem('refreshToken', refreshToken);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return innerData as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration verification failed');
    }
  }
);

export const loginWithGoogleThunk = createAsyncThunk(
  'auth/loginWithGoogle',
  async (tokenPayload: string | { token: string }, { rejectWithValue }) => {
    try {
      const response = await authService.loginWithGoogle(tokenPayload);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;

      if (innerData?.isNewUser) {
        return { isNewUser: true, googleData: innerData.googleData || innerData };
      }

      return ((await persistLoginResult(innerData)) || innerData) as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Google Login failed');
    }
  }
);

export const loginWithMicrosoftThunk = createAsyncThunk(
  'auth/loginWithMicrosoft',
  async (tokenPayload: string | { token: string }, { rejectWithValue }) => {
    try {
      const response = await authService.loginWithMicrosoft(tokenPayload);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;

      if (innerData?.isNewUser) {
        return { isNewUser: true, googleData: innerData.microsoftData || innerData.googleData || innerData };
      }

      return ((await persistLoginResult(innerData)) || innerData) as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Microsoft Login failed');
    }
  }
);

export const loginWithAppleThunk = createAsyncThunk(
  'auth/loginWithApple',
  async (tokenPayload: { token: string; nonce: string; fullName?: string }, { rejectWithValue }) => {
    try {
      const response = await authService.loginWithApple(tokenPayload);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;

      if (innerData?.isNewUser) {
        return { isNewUser: true, appleData: innerData.appleData || innerData };
      }

      const persisted = await persistLoginResult(innerData);
      return (persisted ? { ...persisted, availableWorkspaces: persisted.user.availableWorkspaces } : innerData) as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Apple Login failed');
    }
  }
);
/** Accepts an invitation using a verified SSO provider and persists the session. */
export const acceptSsoInviteThunk = createAsyncThunk(
  'auth/acceptSsoInvite',
  async (
    payload: {
      inviteToken: string;
      ssoCredential?: string;
      code?: string;
      codeVerifier?: string;
      redirectUri?: string;
      clientId?: string;
      nonce?: string;
      fullName?: string;
      provider: 'google' | 'microsoft' | 'apple';
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.acceptSsoInvite(payload);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;
      const persisted = await persistLoginResult(innerData);
      if (!persisted) {
        return rejectWithValue(body?.message || 'Invalid invitation acceptance response');
      }
      return persisted as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to accept invitation via SSO');
    }
  }
);



/** Decline one invitation (signed in) from a notification: by invitation id or link token. */
export const rejectInviteThunk = createAsyncThunk(
  'auth/rejectInvite',
  async ({ token, email }: { token: string; email?: string }, { rejectWithValue }) => {
    try {
      const response = await authService.rejectInvite({ token, email });
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return body?.data || body;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to reject invitation');
    }
  }
);



/** OTP / invitation error details from the API (code, attempts left, retry time). */
export interface AuthErrorDetail {
  message: string;
  code?: string;
  attemptsRemaining?: number;
  retryAfterSeconds?: number;
}

export const toAuthErrorDetail = (error: any, fallback: string): AuthErrorDetail => {
  const data = error?.response?.data || {};
  const details = data.details && !Array.isArray(data.details) ? data.details : {};
  return {
    message: data.message || error?.message || fallback,
    code: data.code || details.code,
    attemptsRemaining: details.attemptsRemaining,
    retryAfterSeconds: details.retryAfterSeconds,
  };
};

/** Unwraps a login result and persists the session. Shared by every sign-in path. */
const persistLoginResult = async (innerData: any) => {
  const token = innerData?.token;
  const refreshToken = innerData?.refreshToken;
  const rawUser = innerData?.user;
  if (!token || !rawUser) return null;
  const user = {
    ...rawUser,
    availableWorkspaces: innerData?.availableWorkspaces || rawUser?.availableWorkspaces || [],
    // Which first screen to open; decided by the server from permissions
    landing: innerData?.landing || rawUser?.landing || null,
  };
  await storage.setItem('token', token);
  if (refreshToken) await storage.setItem('refreshToken', refreshToken);
  await storage.setItem('user', JSON.stringify(user));
  return { ...innerData, user };
};

export const requestOtp = createAsyncThunk(
  'auth/requestOtp',
  async ({ identifier, isEmail }: { identifier: string; isEmail: boolean }, { rejectWithValue }) => {
    try {
      const response = isEmail
        ? await authService.initiateEmailOtpLogin(identifier)
        : await authService.initiatePhoneLogin(identifier);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      if (body && body.success === false) {
        return rejectWithValue({ message: body.message || 'Failed to request OTP' } as AuthErrorDetail);
      }
      return response as any;
    } catch (error: any) {
      return rejectWithValue(toAuthErrorDetail(error, 'Failed to request OTP'));
    }
  }
);

export const verifyOtpLogin = createAsyncThunk(
  'auth/verifyOtpLogin',
  async ({ identifier, code, isEmail, inviteToken }: { identifier: string; code: string; isEmail: boolean; inviteToken?: string }, { rejectWithValue }) => {
    try {
      const response = isEmail
        ? await authService.verifyEmailOtpLogin(identifier, code, inviteToken)
        : await authService.verifyPhoneLogin(identifier, code, inviteToken);

      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      if (body && body.success === false) {
        return rejectWithValue({ message: body.message || 'OTP verification failed' } as AuthErrorDetail);
      }

      const innerData = body?.data || body;
      // Invited but not yet activated, and no invitation link: choose which invitation to accept
      if (innerData?.requiresInvitationSelection) {
        return { selection: { ticket: innerData.ticket, pendingInvitations: innerData.pendingInvitations || [] } } as any;
      }

      const persisted = await persistLoginResult(innerData);
      if (!persisted) {
        return rejectWithValue({ message: body?.message || 'Invalid OTP response from server' } as AuthErrorDetail);
      }
      return persisted as any;
    } catch (error: any) {
      return rejectWithValue(toAuthErrorDetail(error, 'OTP verification failed'));
    }
  }
);


export const switchWorkspaceContextThunk = createAsyncThunk<
  any,
  {
    targetOrgId?: string;
    targetRole?: string;
    targetVillaId?: string;
    targetAssignmentId?: string;
    targetAssignmentName?: string;
    targetAssignmentType?: string;
  },
  { rejectValue: string }
>('auth/switchWorkspaceContext', async (payload, { dispatch, rejectWithValue }) => {
  try {
    const cleanPayload: {
      targetOrgId?: string;
      targetRole?: string;
      targetVillaId?: string;
      targetAssignmentId?: string;
      targetAssignmentName?: string;
      targetAssignmentType?: string;
    } = {};
    if (payload?.targetOrgId && typeof payload.targetOrgId === 'string' && /^[0-9a-fA-F]{24}$/.test(payload.targetOrgId.trim())) {
      cleanPayload.targetOrgId = payload.targetOrgId.trim();
    }
    if (payload?.targetVillaId && typeof payload.targetVillaId === 'string' && /^[0-9a-fA-F]{24}$/.test(payload.targetVillaId.trim())) {
      cleanPayload.targetVillaId = payload.targetVillaId.trim();
    }
    if (payload?.targetRole && typeof payload.targetRole === 'string' && payload.targetRole.trim()) {
      cleanPayload.targetRole = payload.targetRole.trim();
    }
    if (payload?.targetAssignmentId && typeof payload.targetAssignmentId === 'string' && payload.targetAssignmentId.trim()) {
      cleanPayload.targetAssignmentId = payload.targetAssignmentId.trim();
    }
    if (payload?.targetAssignmentName && typeof payload.targetAssignmentName === 'string' && payload.targetAssignmentName.trim()) {
      cleanPayload.targetAssignmentName = payload.targetAssignmentName.trim();
    }
    if (payload?.targetAssignmentType && typeof payload.targetAssignmentType === 'string' && payload.targetAssignmentType.trim()) {
      cleanPayload.targetAssignmentType = payload.targetAssignmentType.trim();
    }

    let response;
    try {
      response = await authService.switchContext(cleanPayload);
    } catch (err: any) {
      if (err?.message === 'Session expired. Please log in again.') {
        throw err;
      }
      if (cleanPayload.targetOrgId || cleanPayload.targetVillaId || cleanPayload.targetRole || cleanPayload.targetAssignmentId) {
        console.warn(`Target org ${cleanPayload.targetOrgId} unavailable or deleted. Falling back to default workspace context.`);
        response = await authService.switchContext({});
      } else {
        throw err;
      }
    }

    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    const innerData = body?.data || body;

    const token = innerData?.token;
    const refreshToken = innerData?.refreshToken;
    const rawUser = innerData?.user;
    const availableWorkspaces = innerData?.availableWorkspaces || rawUser?.availableWorkspaces || [];
    const user = rawUser ? { ...rawUser, availableWorkspaces } : null;

    if (token) await storage.setItem('token', token);
    if (refreshToken) await storage.setItem('refreshToken', refreshToken);
    if (user) await storage.setItem('user', JSON.stringify(user));

    const { fetchQuickActionsThunk, resetQuickActionsForContext } = require('../../dashboard/dashboardSlice');
    dispatch(resetQuickActionsForContext());
    const targetVId = cleanPayload.targetVillaId || user?.activeVillaId || user?.villaId;
    const targetVNum = user?.activeVillaNumber || user?.villaNumber || user?.unitNumber;
    dispatch(
      fetchQuickActionsThunk({
        orgId: user?.activeOrgId || user?.orgId || cleanPayload.targetOrgId,
        villaId: targetVId,
        villaNumber: targetVNum,
      })
    );

    return { ...innerData, user };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to switch workspace context');
  }
});



export const performLogout = createAsyncThunk(
  'auth/performLogout',
  async (_, { dispatch, getState }) => {
    const state: any = getState();
    const userId = state?.auth?.user?.id || state?.auth?.user?._id;
    // Stop push notifications for this device while the session is still valid
    // (afterwards the unregister request would be rejected and pushes would continue)
    if (userId) {
      try {
        const pushToken = await storage.getItem(`registered_push_token_${userId}`);
        if (pushToken) {
          await deviceTokenService.unregisterToken(pushToken, userId);
        }
      } catch (_) {
        // best effort; logout continues
      }
    }
    try {
      // Sending the refresh token lets the server revoke this session even if the access token expired
      await authService.logoutApi();
    } catch (error) {
      console.warn('Logout API call failed, removing local session anyway.');
    }
    await storage.removeItem('token');
    await storage.removeItem('refreshToken');
    await storage.removeItem('user');
    dispatch(logout());
    return true;
  }
);

export const deleteAccountThunk = createAsyncThunk(
  'auth/deleteAccount',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await authService.deleteAccount();
      await storage.removeItem('token');
      await storage.removeItem('refreshToken');
      await storage.removeItem('user');
      dispatch(logout());
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete account');
    }
  }
);

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(payload);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;
      return innerData;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to update profile');
    }
  }
);




const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
      state.successMsg = null;
      state.otpSent = false;
    },
    clearStatus: (state) => {
      state.error = null;
      state.errorDetail = null;
      state.successMsg = null;
      state.loading = false;
      state.otpSent = false;
    },
    clearInvitationSelection: (state) => {
      state.invitationSelection = null;
    },
    updateTokenAndUser: (state, action: PayloadAction<{ token?: string; refreshToken?: string; user?: User }>) => {
      const { token, refreshToken, user } = action.payload;
      if (token) {
        state.token = token;
        storage.setItem('token', token);
      }
      if (refreshToken) {
        state.refreshToken = refreshToken;
        storage.setItem('refreshToken', refreshToken);
      }
      if (user) {
        const normalized = normalizeUser(user);
        state.user = normalized;
        if (normalized) {
          storage.setItem('user', JSON.stringify(normalized));
        }
      }
    },
    updateUserProfile: (
      state,
      action: PayloadAction<{ username?: string; name?: string; email?: string; phone?: string; avatar?: string }>
    ) => {
      if (state.user) {
        const updated = {
          ...state.user,
          ...action.payload,
        };
        state.user = updated;
        storage.setItem('user', JSON.stringify(updated)).catch(() => {});
      }
    },
    setActiveUnitContext: (
      state,
      action: PayloadAction<{ villaId?: string; villaNumber?: string; orgId?: string; orgName?: string }>
    ) => {
      if (state.user) {
        const u = state.user as any;
        const updated = {
          ...state.user,
          villaId: action.payload.villaId || u.villaId,
          activeVillaId: action.payload.villaId || u.activeVillaId,
          villaNumber: action.payload.villaNumber || u.villaNumber,
          activeVillaNumber: action.payload.villaNumber || u.activeVillaNumber,
          unitNumber: action.payload.villaNumber || u.unitNumber,
          ...(action.payload.orgId ? { orgId: action.payload.orgId, activeOrgId: action.payload.orgId } : {}),
          ...(action.payload.orgName ? { organizationName: action.payload.orgName, activeOrganizationName: action.payload.orgName } : {}),
        };
        state.user = normalizeUser(updated);
        if (state.user) {
          storage.setItem('user', JSON.stringify(state.user)).catch(() => {});
        }
      }
    },
    setActiveVillaUnit: (
      state,
      action: PayloadAction<{ villaNumber: string; block?: string; villaId?: string }>
    ) => {
      if (state.user) {
        const { villaNumber, block, villaId } = action.payload;
        const updated = {
          ...state.user,
          villaNumber,
          activeVillaNumber: villaNumber,
          unitNumber: villaNumber,
          ...(block !== undefined ? { villaBlock: block, block } : {}),
          ...(villaId !== undefined ? { activeVillaId: villaId, villaId } : {}),
        };
        state.user = normalizeUser(updated);
        if (state.user) {
          storage.setItem('user', JSON.stringify(state.user)).catch(() => {});
        }
      }
    },
    setActiveCommunityOrg: (
      state,
      action: PayloadAction<{ orgId?: string; orgName: string }>
    ) => {
      if (state.user) {
        const { orgId, orgName } = action.payload;
        const workspaces = (state.user as any)?.availableWorkspaces || [];
        const targetWs = Array.isArray(workspaces)
          ? workspaces.find((w: any) => {
              const wId = w.orgId || w._id || w.id;
              return orgId && wId ? wId.toString() === orgId.toString() : false;
            })
          : null;

        const updated = {
          ...state.user,
          orgName,
          organizationName: orgName,
          activeOrganizationName: orgName,
          ...(orgId ? { orgId, activeOrgId: orgId } : {}),
          // Cleanly reset or align villa unit to target community workspace
          villaNumber: targetWs?.villaNumber || targetWs?.unitNumber || '',
          activeVillaNumber: targetWs?.villaNumber || targetWs?.unitNumber || '',
          unitNumber: targetWs?.villaNumber || targetWs?.unitNumber || '',
          villaId: targetWs?.villaId || targetWs?.unitId || '',
          activeVillaId: targetWs?.villaId || targetWs?.unitId || '',
          // Cleanly align role if specified on target workspace
          ...(targetWs?.roleName ? { role: targetWs.roleName.split(',')[0].trim(), activeRole: targetWs.roleName.split(',')[0].trim() } : {}),
        };
        state.user = normalizeUser(updated);
        if (state.user) {
          storage.setItem('user', JSON.stringify(state.user)).catch(() => {});
        }
      }
    },
    setActiveRolePersona: (
      state,
      action: PayloadAction<{ role: string }>
    ) => {
      if (state.user) {
        const { role } = action.payload;
        const updated = {
          ...state.user,
          role,
          activeRole: role,
        };
        state.user = normalizeUser(updated);
        if (state.user) {
          storage.setItem('user', JSON.stringify(state.user)).catch(() => {});
        }
      }
    },
    setActiveAssignment: (
      state,
      action: PayloadAction<{ assignment: any }>
    ) => {
      if (state.user) {
        const { assignment } = action.payload;
        const updated = {
          ...state.user,
          activeAssignment: assignment,
        };
        state.user = normalizeUser(updated);
        if (state.user) {
          storage.setItem('user', JSON.stringify(state.user)).catch(() => {});
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Bootstrap
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = normalizeUser(action.payload.user);
        state.isAuthenticated = !!(action.payload.token && state.user?.id);
        state.isInitialized = true;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.token = null;
        state.refreshToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      })
      // Register User
      .addCase(registerUserThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(registerUserThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.successMsg = action.payload?.message || 'Registration successful! Check your email for OTP.';
      })
      .addCase(registerUserThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Registration failed';
      })
      // Verify Registration
      .addCase(verifyRegistrationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(verifyRegistrationThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload?.token || action.payload?.data?.token || null;
        state.refreshToken = action.payload?.refreshToken || action.payload?.data?.refreshToken || null;
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Verification successful!';
      })
      .addCase(verifyRegistrationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Verification failed';
      })
      // Google SSO
      .addCase(loginWithGoogleThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(loginWithGoogleThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.isNewUser) {
          state.successMsg = 'Google account verified. Please complete registration.';
          return;
        }
        state.token = action.payload?.token || action.payload?.data?.token || null;
        state.refreshToken = action.payload?.refreshToken || action.payload?.data?.refreshToken || null;
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Login successful!';
      })
      .addCase(loginWithGoogleThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Google Login failed';
      })
      // Microsoft SSO
      .addCase(loginWithMicrosoftThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(loginWithMicrosoftThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.isNewUser) {
          state.successMsg = 'Microsoft account verified. Please complete registration.';
          return;
        }
        state.token = action.payload?.token || action.payload?.data?.token || null;
        state.refreshToken = action.payload?.refreshToken || action.payload?.data?.refreshToken || null;
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Login successful!';
      })
      .addCase(loginWithMicrosoftThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Microsoft Login failed';
      })
      // Apple SSO
      .addCase(loginWithAppleThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(loginWithAppleThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.isNewUser) {
          state.successMsg = 'Apple account verified. Please complete registration.';
          return;
        }
        state.token = action.payload?.token || action.payload?.data?.token || null;
        state.refreshToken = action.payload?.refreshToken || action.payload?.data?.refreshToken || null;
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Login successful!';
      })
      .addCase(loginWithAppleThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Apple Login failed';
      })
      // Accept SSO Invitation
      .addCase(acceptSsoInviteThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(acceptSsoInviteThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload?.token || action.payload?.data?.token || null;
        state.refreshToken = action.payload?.refreshToken || action.payload?.data?.refreshToken || null;
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Invitation accepted via SSO successfully!';
      })
      .addCase(acceptSsoInviteThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to accept invitation via SSO';
      })
      // Request OTP
      .addCase(requestOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorDetail = null;
        state.successMsg = null;
      })
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSent = true;
        state.successMsg = action.payload?.message || 'OTP sent successfully!';
      })
      .addCase(requestOtp.rejected, (state, action) => {
        const detail = action.payload as AuthErrorDetail | undefined;
        state.loading = false;
        state.error = detail?.message || 'Failed to send OTP';
        state.errorDetail = detail ? { code: detail.code, retryAfterSeconds: detail.retryAfterSeconds } : null;
      })
      // Verify OTP Login
      .addCase(verifyOtpLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorDetail = null;
        state.successMsg = null;
      })
      .addCase(verifyOtpLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSent = false;
        if (action.payload?.selection) {
          // Identity verified, but an invitation must be chosen before any session exists
          state.invitationSelection = action.payload.selection;
          return;
        }
        state.invitationSelection = null;
        state.token = action.payload?.token || null;
        state.refreshToken = action.payload?.refreshToken || null;
        state.user = normalizeUser(action.payload?.user || null);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = 'Login successful!';
      })
      .addCase(verifyOtpLogin.rejected, (state, action) => {
        const detail = action.payload as AuthErrorDetail | undefined;
        state.loading = false;
        state.error = detail?.message || 'Login failed';
        state.errorDetail = detail
          ? { code: detail.code, attemptsRemaining: detail.attemptsRemaining, retryAfterSeconds: detail.retryAfterSeconds }
          : null;
      })
      // Switch Workspace Context
      .addCase(switchWorkspaceContextThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchWorkspaceContextThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.token) {
          state.token = action.payload.token;
        }
        if (action.payload?.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
        const rawUser = action.payload?.user || action.payload?.data?.user;
        if (rawUser) {
          state.user = normalizeUser(rawUser);
          if (state.user) {
            storage.setItem('user', JSON.stringify(state.user)).catch(() => {});
          }
        }
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = 'Workspace context updated';
      })
      .addCase(switchWorkspaceContextThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to switch workspace context';
      })
      .addCase(deleteAccountThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccountThunk.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.successMsg = 'Account deleted successfully';
      })
      .addCase(deleteAccountThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to delete account';
      })
      // Update Profile
      .addCase(updateProfileThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          const updated = {
            ...state.user,
            ...action.payload,
          };
          if (action.payload && (action.payload.avatar === null || action.payload.avatar === '')) {
            updated.avatar = null;
          }
          state.user = updated;
          storage.setItem('user', JSON.stringify(updated)).catch(() => {});
        }
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to update profile';
      });
  },
});

export const {
  logout,
  clearStatus,
  clearInvitationSelection,
  updateTokenAndUser,
  updateUserProfile,
  setActiveUnitContext,
  setActiveVillaUnit,
  setActiveCommunityOrg,
  setActiveRolePersona,
  setActiveAssignment,
} = authSlice.actions;
export default authSlice.reducer;
