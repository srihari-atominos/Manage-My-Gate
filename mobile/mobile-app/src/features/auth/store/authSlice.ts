import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService from '../services/authService';
import storage from '../../../utils/storage';

export interface User {
  id: string;
  _id?: string;
  email: string;
  name?: string;
  role?: string;
  orgId?: string;
  permissions?: string[];
  isPlatform?: boolean;
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
    '';

  return {
    ...user,
    id: canonicalId,
    _id: canonicalId || user._id,
    orgId: canonicalOrgId,
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
    const token = await storage.getItem('token');
    const refreshToken = await storage.getItem('refreshToken');
    const userStr = await storage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, refreshToken, user };
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: any, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
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
        return rejectWithValue('User not found. Please register first.');
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



export const requestOtp = createAsyncThunk(
  'auth/requestOtp',
  async ({ identifier, isEmail }: { identifier: string; isEmail: boolean }, { rejectWithValue }) => {
    try {
      const response = isEmail
        ? await authService.initiateEmailOtpLogin(identifier)
        : await authService.initiatePhoneLogin(identifier);
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
      const innerData = body?.data || body;

      const token = innerData?.token;
      const refreshToken = innerData?.refreshToken;
      const user = innerData?.user;

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
    const response = await authService.switchContext(payload);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    const innerData = body?.data || body;

    const token = innerData?.token;
    const refreshToken = innerData?.refreshToken;
    const user = innerData?.user;

    if (token) await storage.setItem('token', token);
    if (refreshToken) await storage.setItem('refreshToken', refreshToken);
    if (user) await storage.setItem('user', JSON.stringify(user));

    const { fetchQuickActionsThunk } = require('../../dashboard/dashboardSlice');
    dispatch(fetchQuickActionsThunk());

    return innerData;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to switch workspace context');
  }
});

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
      });
  },
});

export const { logout, clearStatus, updateTokenAndUser } = authSlice.actions;
export default authSlice.reducer;
