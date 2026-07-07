import dashboardService from './amenityDashboard.service.js';
class AmenityDashboardController {
  async getKpis(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await dashboardService.getKpis(orgId);
      res.success(data, 'Dashboard KPIs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRevenue(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await dashboardService.getRevenue(orgId);
      res.success(data, 'Revenue retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getOccupancy(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await dashboardService.getOccupancy(orgId);
      res.success(data, 'Occupancy retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTrends(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await dashboardService.getTrends(orgId);
      res.success(data, 'Trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivity(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const data = await dashboardService.getRecentActivity(orgId);
      res.success(data, 'Recent activity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCalendarEvents(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { startDate, endDate } = req.query; // YYYY-MM-DD
      const data = await dashboardService.getCalendarEvents(orgId, startDate, endDate);
      res.success(data, 'Calendar events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCalendarIndicators(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { year, month } = req.query; 
      const data = await dashboardService.getCalendarIndicators(orgId, year, month);
      res.success(data, 'Calendar indicators retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AmenityDashboardController();
