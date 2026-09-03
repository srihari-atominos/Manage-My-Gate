import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService from '../services/authService';
import storage from '../../../utils/storage';

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
    extractId(user.organizationId) ||
    extractId(user.org) ||
    extractId(user.organization) ||
    extractId(user.activeOrgId) ||
    extractId(user.activeOrganizationId) ||
    (Array.isArray(user.availableWorkspaces) && extractId(user.availableWorkspaces[0]?.orgId)) ||
    (Array.isArray(user.availableWorkspaces) && extractId(user.availableWorkspaces[0]?._id)) ||
    (Array.isArray(user.availableWorkspaces) && extractId(user.availableWorkspaces[0]?.id)) ||
    '';

  const orgName = user.organizationName || user.orgName || user.activeOrganizationName || user.organization?.name || '';
  const vNum = user.villaNumber || user.activeVillaNumber || user.unitNumber || '';

  return {
    ...user,
    id: canonicalId,
    _id: canonicalId || user._id,
    orgId: canonicalOrgId,
    orgName,
    organizationName: orgName,
    activeOrganizationName: orgName,
    villaNumber: vNum,
    activeVillaNumber: vNum,
    unitNumber: vNum,
    accessibleUnits: user.accessibleUnits || [],
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
};

export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrapAuth',
  async (_, { dispatch }) => {
    try {
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

      // If token exists, sync latest profile & availableWorkspaces from backend to replace stale cached storage
      if (token) {
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
            console.warn('Target workspace context unavailable or deleted, falling back to default active context:', syncErr?.message);
            try {
              response = await authService.switchContext({});
            } catch (fallbackErr) {
              console.warn('Fallback switchContext failed:', fallbackErr);
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

            return { token: freshToken, refreshToken: freshRefreshToken, user: freshUser };
          }
        } catch (syncErr) {
          console.warn('Could not refresh auth session from backend, using cached session:', syncErr);
        }
      }

      return { token, refreshToken, user };
    } catch (err) {
      console.warn('Error bootstrapping auth state from storage:', err);
      return { token: null, refreshToken: null, user: null };
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: any, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      
      if (body && body.success === false) {
        return rejectWithValue(body.message || 'Login failed');
      }

      const innerData = body?.data || body;
      const token = innerData?.token;
      const refreshToken = innerData?.refreshToken;
      const rawUser = innerData?.user;
      const availableWorkspaces = innerData?.availableWorkspaces || rawUser?.availableWorkspaces || [];
      const user = rawUser ? { ...rawUser, availableWorkspaces } : null;

      if (!token || !user) {
        return rejectWithValue(body?.message || 'Invalid credentials or login response');
      }

      if (token) await storage.setItem('token', token);
      if (refreshToken) await storage.setItem('refreshToken', refreshToken);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return { ...innerData, user } as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
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

      const token = innerData?.token;
      const user = innerData?.user;

      if (token) await storage.setItem('token', token);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return innerData as any;
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

      const token = innerData?.token;
      const user = innerData?.user;

      if (token) await storage.setItem('token', token);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return innerData as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Microsoft Login failed');
    }
  }
);

export const acceptInviteThunk = createAsyncThunk(
  'auth/acceptInvite',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authService.acceptInvite({ token, password });
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      if (body && body.success === false) {
        return rejectWithValue(body.message || 'Failed to accept invitation');
      }

      const innerData = body?.data || body;
      const authToken = innerData?.token;
      const refreshToken = innerData?.refreshToken;
      const rawUser = innerData?.user;
      const user = normalizeUser(rawUser);

      if (authToken) await storage.setItem('token', authToken);
      if (refreshToken) await storage.setItem('refreshToken', refreshToken);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return { ...innerData, user } as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to accept invitation');
    }
  }
);



export const requestOtp = createAsyncThunk(
  'auth/requestOtp',
  async ({ identifier, isEmail }: { identifier: string; isEmail: boolean }, { rejectWithValue }) => {
    try {
      const response = isEmail
        ? await authService.initiateEmailOtpLogin(identifier)
        : await authService.initiatePhoneLogin(identifier);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      if (body && body.success === false) {
        return rejectWithValue(body.message || 'Failed to request OTP');
      }
      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to request OTP');
    }
  }
);

export const verifyOtpLogin = createAsyncThunk(
  'auth/verifyOtpLogin',
  async ({ identifier, code, isEmail }: { identifier: string; code: string; isEmail: boolean }, { rejectWithValue }) => {
    try {
      const response = isEmail
        ? await authService.verifyEmailOtpLogin(identifier, code)
        : await authService.verifyPhoneLogin(identifier, code);

      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      if (body && body.success === false) {
        return rejectWithValue(body.message || 'OTP verification failed');
      }

      const innerData = body?.data || body;
      const token = innerData?.token;
      const refreshToken = innerData?.refreshToken;
      const user = innerData?.user;

      if (!token || !user) {
        return rejectWithValue(body?.message || 'Invalid OTP response from server');
      }

      if (token) await storage.setItem('token', token);
      if (refreshToken) await storage.setItem('refreshToken', refreshToken);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return innerData as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'OTP verification failed');
    }
  }
);

export const switchWorkspaceContextThunk = createAsyncThunk<
  any,
  { targetOrgId?: string; targetRole?: string; targetVillaId?: string },
  { rejectValue: string }
>('auth/switchWorkspaceContext', async (payload, { dispatch, rejectWithValue }) => {
  try {
    const cleanPayload: { targetOrgId?: string; targetRole?: string; targetVillaId?: string } = {};
    if (payload?.targetOrgId && typeof payload.targetOrgId === 'string' && /^[0-9a-fA-F]{24}$/.test(payload.targetOrgId.trim())) {
      cleanPayload.targetOrgId = payload.targetOrgId.trim();
    }
    if (payload?.targetVillaId && typeof payload.targetVillaId === 'string' && /^[0-9a-fA-F]{24}$/.test(payload.targetVillaId.trim())) {
      cleanPayload.targetVillaId = payload.targetVillaId.trim();
    }
    if (payload?.targetRole && typeof payload.targetRole === 'string' && payload.targetRole.trim()) {
      cleanPayload.targetRole = payload.targetRole.trim();
    }

    let response;
    try {
      response = await authService.switchContext(cleanPayload);
    } catch (err: any) {
      if (cleanPayload.targetOrgId) {
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

    const { fetchQuickActionsThunk } = require('../../dashboard/dashboardSlice');
    dispatch(fetchQuickActionsThunk());

    return { ...innerData, user };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to switch workspace context');
  }
});

export const createWorkspaceThunk = createAsyncThunk(
  'auth/createWorkspace',
  async (workspaceData: any, { rejectWithValue }) => {
    try {
      const response = await authService.createWorkspace(workspaceData);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      if (body && body.success === false) {
        return rejectWithValue(body.message || 'Failed to create workspace');
      }

      const innerData = body?.data || body;
      const token = innerData?.token;
      const refreshToken = innerData?.refreshToken;
      const rawUser = innerData?.user;
      const availableWorkspaces = innerData?.availableWorkspaces || rawUser?.availableWorkspaces || [];
      const user = rawUser ? { ...rawUser, availableWorkspaces } : null;

      if (token) await storage.setItem('token', token);
      if (refreshToken) await storage.setItem('refreshToken', refreshToken);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return { ...innerData, user } as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create workspace');
    }
  }
);

export const updateOrganizationFeaturesThunk = createAsyncThunk(
  'auth/updateOrganizationFeatures',
  async ({ orgId, features }: { orgId: string; features: string[] }, { rejectWithValue }) => {
    try {
      const response = await authService.updateOrganizationFeatures(orgId, features);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      if (body && body.success === false) {
        return rejectWithValue(body.message || 'Failed to update organization features');
      }

      const innerData = body?.data || body;
      const token = innerData?.token;
      const refreshToken = innerData?.refreshToken;
      const user = innerData?.user;

      if (token) await storage.setItem('token', token);
      if (refreshToken) await storage.setItem('refreshToken', refreshToken);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return innerData as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update features');
    }
  }
);

export const performLogout = createAsyncThunk(
  'auth/performLogout',
  async (_, { dispatch }) => {
    try {
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
      state.successMsg = null;
      state.loading = false;
      state.otpSent = false;
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
      // Login User
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload?.token || action.payload?.data?.token || null;
        state.refreshToken = action.payload?.refreshToken || action.payload?.data?.refreshToken || null;
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Login successful!';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Login failed';
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
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Login successful!';
      })
      .addCase(loginWithMicrosoftThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Microsoft Login failed';
      })
      // Accept Invitation
      .addCase(acceptInviteThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(acceptInviteThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload?.token || action.payload?.data?.token || null;
        state.refreshToken = action.payload?.refreshToken || action.payload?.data?.refreshToken || null;
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Invitation accepted and account activated successfully!';
      })
      .addCase(acceptInviteThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to accept invitation';
      })
      // Request OTP
      .addCase(requestOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSent = true;
        state.successMsg = action.payload?.message || 'OTP sent successfully!';
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to send OTP';
      })
      // Verify OTP Login
      .addCase(verifyOtpLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(verifyOtpLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSent = false;
        state.token = action.payload?.token || action.payload?.data?.token || null;
        state.refreshToken = action.payload?.refreshToken || action.payload?.data?.refreshToken || null;
        const rawUser = action.payload?.user || action.payload?.data?.user || null;
        state.user = normalizeUser(rawUser);
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = action.payload?.message || 'Login successful!';
      })
      .addCase(verifyOtpLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Login failed';
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
        if (action.payload?.user) {
          state.user = normalizeUser(action.payload.user);
        }
        state.successMsg = 'Workspace context updated';
      })
      .addCase(switchWorkspaceContextThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to switch workspace context';
      })
      // Create Workspace
      .addCase(createWorkspaceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(createWorkspaceThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.token) {
          state.token = action.payload.token;
        }
        if (action.payload?.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
        const rawUser = action.payload?.user || action.payload?.data?.user || state.user || null;
        const rawOrg = action.payload?.organization || action.payload?.data?.organization;
        const availableWorkspaces = action.payload?.availableWorkspaces || rawUser?.availableWorkspaces || state.user?.availableWorkspaces || [];
        
        if (rawUser) {
          const createdOrgId =
            rawUser.orgId ||
            rawUser.activeOrgId ||
            rawUser.organizationId ||
            rawOrg?._id ||
            rawOrg?.id ||
            (Array.isArray(availableWorkspaces) && (availableWorkspaces[0]?.orgId || availableWorkspaces[0]?._id));

          const userWithWorkspaces = {
            ...rawUser,
            orgId: createdOrgId || rawUser.orgId || state.user?.orgId,
            activeOrgId: createdOrgId || rawUser.activeOrgId || state.user?.activeOrgId,
            availableWorkspaces,
          };
          state.user = normalizeUser(userWithWorkspaces);
          if (state.user) {
            storage.setItem('user', JSON.stringify(state.user)).catch(() => {});
          }
        }
        state.isAuthenticated = !!(state.token && state.user?.id);
        state.successMsg = 'Organization workspace created successfully!';
      })
      .addCase(createWorkspaceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to create workspace';
      })
      // Update Organization Features
      .addCase(updateOrganizationFeaturesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(updateOrganizationFeaturesThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.token) {
          state.token = action.payload.token;
        }
        if (action.payload?.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
        const rawUser = action.payload?.user || state.user || null;
        const organization = action.payload?.organization;
        const updatedFeatures = organization?.allowedFeatures || action.meta?.arg?.features;

        if (rawUser) {
          const userWithWorkspaces = {
            ...rawUser,
            allowedFeatures: updatedFeatures || rawUser?.allowedFeatures || [],
            availableWorkspaces: action.payload?.availableWorkspaces || rawUser?.availableWorkspaces || state.user?.availableWorkspaces,
          };
          state.user = normalizeUser(userWithWorkspaces);
          if (state.user) {
            storage.setItem('user', JSON.stringify(state.user)).catch(() => {});
          }
        }
        state.successMsg = 'Organization features configured successfully!';
      })
      .addCase(updateOrganizationFeaturesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to update organization features';
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
      });
  },
});

export const { logout, clearStatus, updateTokenAndUser, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
