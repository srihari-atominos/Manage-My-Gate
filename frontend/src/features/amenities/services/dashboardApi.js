import apiClient from '../../../services/apiClient.js';

export const dashboardApi = {
  getKpis: () => apiClient.get('/v1/amenity-dashboard/kpi'),
  getRevenue: () => apiClient.get('/v1/amenity-dashboard/revenue'),
  getOccupancy: () => apiClient.get('/v1/amenity-dashboard/occupancy'),
  getTrends: () => apiClient.get('/v1/amenity-dashboard/trends'),
  getRecentActivity: () => apiClient.get('/v1/amenity-dashboard/recent-activity'),
  getCalendarEvents: (date) => apiClient.get('/v1/amenity-dashboard/calendar-events', { params: { date } }),
  getCalendarIndicators: (year, month) => apiClient.get('/v1/amenity-dashboard/calendar-indicators', { params: { year, month } }),
};

export default dashboardApi;
