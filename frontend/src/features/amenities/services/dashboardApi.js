import apiClient from '../../../services/apiClient.js';

export const dashboardApi = {
  getKpis: () => apiClient.get('/amenity-dashboard/kpi'),
  getRevenue: () => apiClient.get('/amenity-dashboard/revenue'),
  getOccupancy: () => apiClient.get('/amenity-dashboard/occupancy'),
  getTrends: () => apiClient.get('/amenity-dashboard/trends'),
  getRecentActivity: () => apiClient.get('/amenity-dashboard/recent-activity'),
  getCalendarEvents: (date) => apiClient.get('/amenity-dashboard/calendar-events', { params: { date } }),
  getCalendarIndicators: (year, month) => apiClient.get('/amenity-dashboard/calendar-indicators', { params: { year, month } }),
};

export default dashboardApi;
