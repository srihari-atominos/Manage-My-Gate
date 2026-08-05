import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import dashboardService, {
  FeatureCategory,
  UserPreferencesResponse,
} from './dashboardService';

export const DEFAULT_QUICK_ACTIONS = [
  'billing_dashboard',
  'visitor_resident_passes',
  'complaints_track_requests',
  'notices_active_board',
];

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
    const data = await dashboardService.fetchQuickActions();
    if (!data || !data.activeQuickActions || data.activeQuickActions.length === 0) {
      return {
        activeQuickActions: DEFAULT_QUICK_ACTIONS,
        featureCatalog: data?.featureCatalog || [],
      };
    }
    return data;
  } catch (error: any) {
    // If request fails, return default quick actions fallback
    return rejectWithValue(error?.message || 'Failed to fetch user preferences');
  }
});

/**
 * Async Thunk to update customized quick actions (up to 7 items)
 */
export const updateQuickActionsThunk = createAsyncThunk<
  UserPreferencesResponse,
  string[],
  { rejectValue: string }
>('dashboard/updateQuickActions', async (activeQuickActions: string[], { rejectWithValue }) => {
  try {
    const data = await dashboardService.updateQuickActions(activeQuickActions);
    return data;
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
        } else {
          state.activeQuickActions = DEFAULT_QUICK_ACTIONS;
        }
        if (action.payload?.featureCatalog) {
          state.featureCatalog = action.payload.featureCatalog;
        }
      })
      .addCase(fetchQuickActionsThunk.rejected, (state, action) => {
        state.loading = false;
        state.activeQuickActions = DEFAULT_QUICK_ACTIONS; // Fallback to default array on failure
        state.error = action.payload || 'Failed to fetch quick actions';
      })

      // updateQuickActionsThunk
      .addCase(updateQuickActionsThunk.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateQuickActionsThunk.fulfilled, (state, action) => {
        state.updating = false;
        if (action.payload?.activeQuickActions) {
          state.activeQuickActions = action.payload.activeQuickActions;
        }
        if (action.payload?.featureCatalog) {
          state.featureCatalog = action.payload.featureCatalog;
        }
      })
      .addCase(updateQuickActionsThunk.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || 'Failed to update quick actions';
      });
  },
});

export const { clearDashboardError, setActiveQuickActionsLocal } = dashboardSlice.actions;
export default dashboardSlice.reducer;
