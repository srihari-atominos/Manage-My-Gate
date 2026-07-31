import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import dashboardApi from '../services/dashboardApi.js'

export const fetchDashboardStats = createAsyncThunk(
  'amenitiesDashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const [kpiRes, revenueRes, occupancyRes, trendsRes, recentActivityRes] = await Promise.all([
        dashboardApi.getKpis(),
        dashboardApi.getRevenue(),
        dashboardApi.getOccupancy(),
        dashboardApi.getTrends(),
        dashboardApi.getRecentActivity(),
      ])
      return {
        kpis: kpiRes.data,
        revenue: revenueRes.data,
        occupancy: occupancyRes.data,
        trends: trendsRes.data,
        recentActivity: recentActivityRes.data,
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard stats')
    }
  },
)

const initialState = {
  kpis: {
    checkIns: 0,
    revenue: 0,
    occupancy: 0,
    activeMaintenance: 0,
    maintenanceTasks: '0 In Progress',
  },
  revenue: [],
  occupancy: [],
  trends: null,
  recentActivity: [],
  loading: false,
  error: null,
}

const dashboardSlice = createSlice({
  name: 'amenitiesDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.kpis) {
          state.kpis = { ...state.kpis, ...action.payload.kpis }
        }
        if (action.payload.revenue) state.revenue = action.payload.revenue
        if (action.payload.occupancy) state.occupancy = action.payload.occupancy
        if (action.payload.trends) state.trends = action.payload.trends
        if (action.payload.recentActivity) state.recentActivity = action.payload.recentActivity
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export default dashboardSlice.reducer
