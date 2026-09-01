import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import dashboardService, {
  FeatureCategory,
  UserPreferencesResponse,
} from './dashboardService';
import storage from '../../utils/storage';

export const DEFAULT_QUICK_ACTIONS = [
  'visitor_passes',
  'billing_dashboard',
  'complaints_track_requests',
  'amenities_discover',
  'notices_active_board',
];

const STORAGE_KEY = 'user_quick_actions';

export interface DashboardState {
  activeQuickActions: string[];
  featureCatalog: FeatureCategory[];
  loading: boolean;
  updating: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  activeQuickActions: DEFAULT_QUICK_ACTIONS,
  featureCatalog: [],
  loading: false,
  updating: false,
  error: null,
};

/**
 * Async Thunk to fetch user quick actions preferences and dynamic feature catalog
 */
export const fetchQuickActionsThunk = createAsyncThunk<
  UserPreferencesResponse,
  void,
  { rejectValue: string }
>('dashboard/fetchQuickActions', async (_, { rejectWithValue }) => {
  try {
    let localSavedActions: string[] | null = null;
    try {
      const savedStr = await storage.getItem(STORAGE_KEY);
      if (savedStr) {
        localSavedActions = JSON.parse(savedStr);
      }
    } catch (e) {}

    const data = await dashboardService.fetchQuickActions().catch(() => null);

    if (!data || !data.activeQuickActions || data.activeQuickActions.length === 0) {
      return {
        activeQuickActions: localSavedActions && localSavedActions.length > 0 ? localSavedActions : DEFAULT_QUICK_ACTIONS,
        featureCatalog: data?.featureCatalog || [],
      };
    }

    if (localSavedActions && localSavedActions.length > 0) {
      return {
        ...data,
        activeQuickActions: localSavedActions,
      };
    }

    return data;
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to fetch user preferences');
  }
});

/**
 * Async Thunk to update customized quick actions (up to 7 items) with optimistic local persistence
 */
export const updateQuickActionsThunk = createAsyncThunk<
  UserPreferencesResponse,
  string[],
  { rejectValue: string }
>('dashboard/updateQuickActions', async (activeQuickActions: string[], { rejectWithValue }) => {
  try {
    // 1. Persist locally to storage immediately
    await storage.setItem(STORAGE_KEY, JSON.stringify(activeQuickActions)).catch(() => {});

    // 2. Sync to backend API (non-blocking if backend is offline)
    const data = await dashboardService.updateQuickActions(activeQuickActions).catch((err) => {
      console.warn('[Dashboard] Backend quick action sync non-critical warning:', err.message);
      return null;
    });

    return {
      activeQuickActions,
      featureCatalog: data?.featureCatalog || [],
    };
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to update quick actions');
  }
});

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
    setActiveQuickActionsLocal: (state, action: PayloadAction<string[]>) => {
      state.activeQuickActions = action.payload;
      storage.setItem(STORAGE_KEY, JSON.stringify(action.payload)).catch(() => {});
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchQuickActionsThunk
      .addCase(fetchQuickActionsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuickActionsThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.activeQuickActions && action.payload.activeQuickActions.length > 0) {
          state.activeQuickActions = action.payload.activeQuickActions;
        }
        if (action.payload?.featureCatalog) {
          state.featureCatalog = action.payload.featureCatalog;
        }
      })
      .addCase(fetchQuickActionsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch quick actions';
      })

      // updateQuickActionsThunk
      .addCase(updateQuickActionsThunk.pending, (state, action) => {
        state.updating = true;
        state.error = null;
        // Optimistic update
        if (action.meta.arg && action.meta.arg.length > 0) {
          state.activeQuickActions = action.meta.arg;
        }
      })
      .addCase(updateQuickActionsThunk.fulfilled, (state, action) => {
        state.updating = false;
        if (action.payload?.activeQuickActions && action.payload.activeQuickActions.length > 0) {
          state.activeQuickActions = action.payload.activeQuickActions;
        }
        if (action.payload?.featureCatalog && action.payload.featureCatalog.length > 0) {
          state.featureCatalog = action.payload.featureCatalog;
        }
      })
      .addCase(updateQuickActionsThunk.rejected, (state, action) => {
        state.updating = false;
        // Keep optimistic activeQuickActions state even if remote endpoint rejects
      });
  },
});

export const { clearDashboardError, setActiveQuickActionsLocal } = dashboardSlice.actions;
export default dashboardSlice.reducer;
