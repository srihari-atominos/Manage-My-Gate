import apiClient from '../../../services/apiClient.js';

export const dashboardApi = {
  getKpis: () => apiClient.get('/amenity-bookings/stats/kpi'),
  getRevenue: () => apiClient.get('/amenity-bookings/stats/revenue'),
  getOccupancy: () => apiClient.get('/amenity-bookings/stats/occupancy'),
  getTrends: () => apiClient.get('/amenity-bookings/stats/trends'),
  getRecentActivity: () => apiClient.get('/amenity-bookings/stats/recent-activity'),
};

export default dashboardApi;
