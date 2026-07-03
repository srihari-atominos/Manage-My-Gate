import apiClient from '../../../services/apiClient.js';

export const dashboardApi = {
  getKpis: () => apiClient.get('/v1/bookings/stats/kpi'),
  getRevenue: () => apiClient.get('/v1/bookings/stats/revenue'),
  getOccupancy: () => apiClient.get('/v1/bookings/stats/occupancy'),
  getTrends: () => apiClient.get('/v1/bookings/stats/trends'),
  getRecentActivity: () => apiClient.get('/v1/bookings/stats/recent-activity'),
};

export default dashboardApi;
