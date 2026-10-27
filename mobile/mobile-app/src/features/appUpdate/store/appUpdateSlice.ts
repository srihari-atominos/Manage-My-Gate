import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import appUpdateService, { AppReleasePolicy } from '../services/appUpdateService';
import inAppUpdateManager from '../services/inAppUpdateManager';

export interface AppUpdateState {
  policy: AppReleasePolicy | null;
  isLoading: boolean;
  error: string | null;
  promptDismissed: boolean;
  lastCheckedAt: number | null;
  downloadProgress: number;
  isDownloading: boolean;
  isDownloaded: boolean;
  isOptionalModalVisible: boolean;
  isMandatoryModalVisible: boolean;
  playStoreUpdateAvailable: boolean;
}

const initialState: AppUpdateState = {
  policy: null,
  isLoading: false,
  error: null,
  promptDismissed: false,
  lastCheckedAt: null,
  downloadProgress: 0,
  isDownloading: false,
  isDownloaded: false,
  isOptionalModalVisible: false,
  isMandatoryModalVisible: false,
  playStoreUpdateAvailable: false,
};

export const checkAppUpdateThunk = createAsyncThunk(
  'appUpdate/checkAppUpdate',
  async (_, { rejectWithValue }) => {
    try {
      // 1. Fetch policy from backend
      const policy = await appUpdateService.fetchAppUpdatePolicy();

      // 2. Check native Google Play availability in parallel
      let playStoreAvailable = false;
      try {
        const playCheck = await inAppUpdateManager.checkPlayStoreUpdate();
        playStoreAvailable = playCheck.isAvailable;
      } catch (_) {}

      return { policy, playStoreAvailable };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to check app update');
    }
  }
);

export const appUpdateSlice = createSlice({
  name: 'appUpdate',
  initialState,
  reducers: {
    dismissOptionalPrompt(state) {
      state.promptDismissed = true;
      state.isOptionalModalVisible = false;
    },
    showOptionalPrompt(state) {
      if (state.policy && state.policy.action === 'OPTIONAL' && state.policy.hasUpdate) {
        state.isOptionalModalVisible = true;
      }
    },
    setDownloadProgress(state, action: PayloadAction<number>) {
      state.downloadProgress = action.payload;
      state.isDownloading = true;
    },
    setDownloadComplete(state) {
      state.isDownloading = false;
      state.isDownloaded = true;
      state.downloadProgress = 100;
    },
    resetUpdateStatus(state) {
      state.isDownloading = false;
      state.isDownloaded = false;
      state.downloadProgress = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAppUpdateThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAppUpdateThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastCheckedAt = Date.now();
        state.policy = action.payload.policy;
        state.playStoreUpdateAvailable = action.payload.playStoreAvailable;

        if (action.payload.policy.action === 'MANDATORY') {
          state.isMandatoryModalVisible = true;
          state.isOptionalModalVisible = false;
        } else if (
          action.payload.policy.action === 'OPTIONAL' &&
          action.payload.policy.hasUpdate &&
          !state.promptDismissed
        ) {
          state.isOptionalModalVisible = true;
          state.isMandatoryModalVisible = false;
        } else {
          state.isOptionalModalVisible = false;
          state.isMandatoryModalVisible = false;
        }
      })
      .addCase(checkAppUpdateThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Check failed';
        // Note: Fails open on network/backend error so user is not blocked
      });
  },
});

export const {
  dismissOptionalPrompt,
  showOptionalPrompt,
  setDownloadProgress,
  setDownloadComplete,
  resetUpdateStatus,
} = appUpdateSlice.actions;

export default appUpdateSlice.reducer;
