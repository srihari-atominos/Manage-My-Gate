import amenityBookingService from './amenityBooking.services.js';
import HttpError from '../../utils/httpError.utils.js';
import Amenity from '../amenity/amenity.model.js';
import AmenityBooking from './amenityBooking.model.js';

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

  async getAdminCalendar(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { startDate, endDate } = req.query;
      
      const aggregatedBookings = await amenityBookingService.getAggregatedCalendarBookings(orgId, startDate, endDate);
      res.success(aggregatedBookings, 'Aggregated calendar bookings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyBookings(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      const filters = {};
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;

      const bookings = await amenityBookingService.getMyBookings(userId, orgId, filters);
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
      
      const amenity = await Amenity.findById(bookingData.amenityId);
      if (!amenity) throw new HttpError(404, 'Amenity not found');

      const maxLimit = amenity.maxBookingsPerUserPerSlot || 2;
      
      const existingBookings = await AmenityBooking.find({
        amenityId: bookingData.amenityId,
        userId: userId,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime, // Check specific slot
        status: { $in: ['pending', 'confirmed', 'active'] }
      });

      const existingSlotsCount = existingBookings.reduce((sum, b) => sum + parseInt(b.numberOfPersons || 1, 10), 0);
      const newSlotsCount = parseInt(bookingData.numberOfPersons || 1, 10);

      if (existingSlotsCount + newSlotsCount > maxLimit) {
        throw new HttpError(400, `Slot limit exceeded. You can only book a maximum of ${maxLimit} spots per slot.`);
      }

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

  async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const { reason } = req.body;
      
      console.log(`[CANCEL BOOKING] Attempting to cancel ID: ${id}, orgId: ${orgId}, userId: ${userId}`);
      
      const cancelled = await amenityBookingService.cancelBooking(id, userId, orgId, reason);
      res.success(cancelled, 'Booking cancelled successfully');
    } catch (error) {
      console.error(`[CANCEL BOOKING ERROR]`, error.message);
      next(error);
    }
  }

  async adminCancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const adminId = req.user.id || req.user._id;
      const { reason } = req.body;
      
      console.log(`[ADMIN CANCEL BOOKING] Attempting to cancel ID: ${id}, orgId: ${orgId}, adminId: ${adminId}`);
      
      const cancelled = await amenityBookingService.cancelBooking(id, adminId, orgId, reason, true);
      res.success(cancelled, 'Booking cancelled successfully by admin');
    } catch (error) {
      console.error(`[ADMIN CANCEL BOOKING ERROR]`, error.message);
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
      // It returns either message Access Granted or Exit Recorded
      res.success(checkedIn, checkedIn.message || 'Checked in successfully');
    } catch (error) { next(error); }
  }

  async getRecentScans(req, res, next) {
    try {
      const scans = await amenityBookingService.getRecentScans(req.tenant.orgId);
      res.success(scans, 'Recent scans retrieved successfully');
    } catch (error) { next(error); }
  }
}

export default new AmenityBookingController();
