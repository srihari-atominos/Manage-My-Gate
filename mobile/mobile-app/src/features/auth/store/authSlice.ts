import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService from '../services/authService';
import storage from '../../../utils/storage';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  orgId?: string;
  permissions?: string[];
  isPlatform?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  successMsg: string | null;
  otpSent: boolean;
  isInitialized: boolean; // Tracks if storage check completed on startup
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  successMsg: null,
  otpSent: false,
  isInitialized: false,
};

// Bootstrap Thunk: Runs on startup to fetch session details from secure storage
export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrapAuth',
  async (_, { dispatch }) => {
    const token = await storage.getItem('token');
    const userStr = await storage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: any, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      const token = response.data?.token;
      const user = response.data?.user;

      if (token) await storage.setItem('token', token);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
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

      const token = response.data?.token;
      const user = response.data?.user;

      if (token) await storage.setItem('token', token);
      if (user) await storage.setItem('user', JSON.stringify(user));

      return response as any;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'OTP verification failed');
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
    updateTokenAndUser: (state, action: PayloadAction<{ token?: string; user?: User }>) => {
      const { token, user } = action.payload;
      if (token) {
        state.token = token;
        storage.setItem('token', token);
      }
      if (user) {
        state.user = user;
        storage.setItem('user', JSON.stringify(user));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Bootstrap
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = !!(action.payload.token && action.payload.user);
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
        state.isAuthenticated = true;
        state.token = action.payload.data?.token || null;
        state.user = action.payload.data?.user || null;
        state.successMsg = action.payload.message || 'Login successful!';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Login failed';
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
        state.successMsg = action.payload.message || 'OTP sent successfully!';
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
        state.isAuthenticated = true;
        state.otpSent = false;
        state.token = action.payload.data?.token || null;
        state.user = action.payload.data?.user || null;
        state.successMsg = action.payload.message || 'Login successful!';
      })
      .addCase(verifyOtpLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Login failed';
      });
  },
});

export const { logout, clearStatus, updateTokenAndUser } = authSlice.actions;
export default authSlice.reducer;
