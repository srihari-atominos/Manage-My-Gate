import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dashboardApi from '../services/dashboardApi.js';

export const fetchDashboardStats = createAsyncThunk(
  'amenitiesDashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const [kpiRes, revenueRes, occupancyRes, recentActivityRes] = await Promise.all([
        dashboardApi.getKpis(),
        dashboardApi.getRevenue(),
        dashboardApi.getOccupancy(),
        dashboardApi.getRecentActivity()
      ]);
      return {
        kpis: kpiRes.data,
        revenue: revenueRes.data,
        occupancy: occupancyRes.data,
        recentActivity: recentActivityRes.data
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  }
);

const initialState = {
  kpis: {
    checkIns: 128,
    revenue: 24500,
    occupancy: 72,
    activeMaintenance: 2,
    maintenanceTasks: 'Tennis Court, Pool Filter'
  },
  revenue: [],
  occupancy: [],
  recentActivity: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'amenitiesDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.kpis) {
          state.kpis = { ...state.kpis, ...action.payload.kpis };
        }
        if (action.payload.revenue) state.revenue = action.payload.revenue;
        if (action.payload.occupancy) state.occupancy = action.payload.occupancy;
        if (action.payload.recentActivity) state.recentActivity = action.payload.recentActivity;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default dashboardSlice.reducer;
