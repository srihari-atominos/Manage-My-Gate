import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import dashboardService, {
  FeatureCategory,
  UserPreferencesResponse,
} from './dashboardService';
import storage from '../../utils/storage';
import type { RootState } from '../../store/store';

export const DEFAULT_QUICK_ACTIONS = [
  'visitor_passes',
  'billing_dashboard',
  'complaints_track_requests',
  'amenities_discover',
  'notices_active_board',
];

/**
 * Returns a user-scoped storage key so dashboard customizations are never
 * shared across multiple accounts on the same physical device.
 */
export const getUserQuickActionsStorageKey = (userId?: string | null) => {
  if (userId && typeof userId === 'string' && userId.trim()) {
    return `user_quick_actions_${userId.trim()}`;
  }
  return null;
};

export interface DashboardState {
  activeQuickActions: string[];
  featureCatalog: FeatureCategory[];
  loading: boolean;
  updating: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  activeQuickActions: [],
  featureCatalog: [],
  loading: false,
  updating: false,
  error: null,
};

/**
 * Async Thunk to fetch user quick actions preferences and dynamic feature catalog.
 * The currently authenticated user's remote preferences are the primary source of truth,
 * with isolated fallback to their account-specific local cache.
 */
export const fetchQuickActionsThunk = createAsyncThunk<
  UserPreferencesResponse,
  void,
  { rejectValue: string; state: RootState }
>('dashboard/fetchQuickActions', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const authUser = (state as any).auth?.user;
    const userId = authUser?._id || authUser?.id;
    const userStorageKey = getUserQuickActionsStorageKey(userId);

    // Clean up any stale un-scoped device storage key from previous legacy versions
    storage.removeItem('user_quick_actions').catch(() => {});

    // 1. Fetch preferences from backend for the currently authenticated user
    const data = await dashboardService.fetchQuickActions().catch(() => null);

    if (data && data.activeQuickActions && data.activeQuickActions.length > 0) {
      if (userStorageKey) {
        await storage.setItem(userStorageKey, JSON.stringify(data.activeQuickActions)).catch(() => {});
      }
      return data;
    }

    // 2. If backend request failed or returned empty (e.g. offline), try local cache for THIS user only
    if (userStorageKey) {
      try {
        const savedStr = await storage.getItem(userStorageKey);
        if (savedStr) {
          const localSavedActions = JSON.parse(savedStr);
          if (Array.isArray(localSavedActions) && localSavedActions.length > 0) {
            return {
              activeQuickActions: localSavedActions,
              featureCatalog: data?.featureCatalog || [],
            };
          }
        }
      } catch (e) {}
    }

    // 3. Return empty array so role-appropriate defaults are calculated per-user
    return {
      activeQuickActions: [],
      featureCatalog: data?.featureCatalog || [],
    };
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to fetch user preferences');
  }
});

/**
 * Async Thunk to update customized quick actions (up to 7 items) with user-scoped local persistence
 */
export const updateQuickActionsThunk = createAsyncThunk<
  UserPreferencesResponse,
  string[],
  { rejectValue: string; state: RootState }
>('dashboard/updateQuickActions', async (activeQuickActions: string[], { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const authUser = (state as any).auth?.user;
    const userId = authUser?._id || authUser?.id;
    const userStorageKey = getUserQuickActionsStorageKey(userId);

    // 1. Persist locally under THIS user's scoped key
    if (userStorageKey) {
      await storage.setItem(userStorageKey, JSON.stringify(activeQuickActions)).catch(() => {});
    }

    // 2. Sync to backend API for the current user
    const data = await dashboardService.updateQuickActions(activeQuickActions).catch((err) => {
      console.warn('[Dashboard] Backend quick action sync non-critical warning:', err?.message);
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
    resetDashboard: (state) => {
      state.activeQuickActions = [];
      state.featureCatalog = [];
      state.loading = false;
      state.updating = false;
      state.error = null;
    },
    setActiveQuickActionsLocal: (
      state,
      action: PayloadAction<{ actions: string[]; userId?: string } | string[]>
    ) => {
      const actions = Array.isArray(action.payload) ? action.payload : action.payload.actions;
      const userId = Array.isArray(action.payload) ? undefined : action.payload.userId;
      state.activeQuickActions = actions;
      const userKey = getUserQuickActionsStorageKey(userId);
      if (userKey) {
        storage.setItem(userKey, JSON.stringify(actions)).catch(() => {});
      }
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
        if (action.payload?.activeQuickActions) {
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
      .addCase(updateQuickActionsThunk.rejected, (state) => {
        state.updating = false;
        // Keep optimistic activeQuickActions state even if remote endpoint rejects
      })

      // Reset dashboard state when logging out or switching accounts
      .addCase('auth/logout', (state) => {
        state.activeQuickActions = [];
        state.featureCatalog = [];
        state.loading = false;
        state.updating = false;
        state.error = null;
      })
      .addCase('auth/performLogout/fulfilled', (state) => {
        state.activeQuickActions = [];
        state.featureCatalog = [];
        state.loading = false;
        state.updating = false;
        state.error = null;
      })
      .addCase('auth/switchWorkspaceContext/fulfilled', (state) => {
        state.activeQuickActions = [];
        state.loading = false;
        state.updating = false;
        state.error = null;
      });
  },
});

export const { clearDashboardError, resetDashboard, setActiveQuickActionsLocal } =
  dashboardSlice.actions;
export default dashboardSlice.reducer;
