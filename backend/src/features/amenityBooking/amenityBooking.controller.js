import amenityBookingService from './amenityBooking.services.js';
import HttpError from '../../utils/httpError.utils.js';

export class AmenityBookingController {
  async getQueue(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.amenityId) filters.amenityId = req.query.amenityId;
      if (req.query.date) filters.date = req.query.date;
      if (req.query.userId) filters.userId = req.query.userId;
      if (req.query.checkedInBy) filters.checkedInBy = req.query.checkedInBy;

      const queue = await amenityBookingService.getBookingsQueue(orgId, page, limit, filters);
      res.success(queue, 'Booking queue retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyBookings(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      const bookings = await amenityBookingService.getMyBookings(userId, orgId);
      res.success(bookings, 'My bookings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createBooking(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      const bookingData = { ...req.body, orgId, userId };
      
      const created = await amenityBookingService.createBooking(bookingData);
      res.success(created, 'Booking placed successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async createManualBooking(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      // Admins pass residentId explicitly in the body
      const bookingData = { ...req.body, orgId, userId: req.body.residentId, isManual: true };
      
      const created = await amenityBookingService.createManualBooking(bookingData);
      res.success(created, 'Manual booking created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async reviewBooking(req, res, next) {
    try {
      const { id } = req.params;
      const { decision, rejectionReason } = req.body;
      const orgId = req.tenant.orgId;
      const reviewerId = req.user.id;
      
      const reviewed = await amenityBookingService.reviewBooking(id, orgId, decision, reviewerId, rejectionReason);
      res.success(reviewed, `Booking ${decision} successfully`);
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      
      const cancelled = await amenityBookingService.cancelBooking(id, userId, orgId);
      res.success(cancelled, 'Booking cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  async getKpiStats(req, res, next) {
    try {
      const stats = await amenityBookingService.getKpiStats(req.tenant.orgId);
      res.success(stats, 'KPI stats retrieved successfully');
    } catch (error) { next(error); }
  }

  async getRevenueStats(req, res, next) {
    try {
      const stats = await amenityBookingService.getRevenueStats(req.tenant.orgId);
      res.success(stats, 'Revenue stats retrieved successfully');
    } catch (error) { next(error); }
  }

  async getOccupancyStats(req, res, next) {
    try {
      const stats = await amenityBookingService.getOccupancyStats(req.tenant.orgId);
      res.success(stats, 'Occupancy stats retrieved successfully');
    } catch (error) { next(error); }
  }

  async getTrendsStats(req, res, next) {
    try {
      const stats = await amenityBookingService.getTrendsStats(req.tenant.orgId);
      res.success(stats, 'Trends stats retrieved successfully');
    } catch (error) { next(error); }
  }

  async getRecentActivity(req, res, next) {
    try {
      const activity = await amenityBookingService.getRecentActivity(req.tenant.orgId);
      res.success(activity, 'Recent activity retrieved successfully');
    } catch (error) { next(error); }
  }

  async getDashboardData(req, res, next) {
    try {
      const data = await amenityBookingService.getDashboardData(req.tenant.orgId);
      res.success(data, 'Dashboard data retrieved successfully');
    } catch (error) { next(error); }
  }

  async checkInBooking(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      const checkedIn = await amenityBookingService.checkInBooking(id, orgId, userId);
      res.success(checkedIn, 'Checked in successfully');
    } catch (error) { next(error); }
  }
}

export default new AmenityBookingController();
