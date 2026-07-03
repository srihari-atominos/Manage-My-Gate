import bookingService from './booking.services.js';

export class BookingController {
  async getAll(req, res, next) {
    try {
      const orgId = req.user?.orgId || req.query.orgId;
      // Allow filtering by userId for resident view
      const filters = {};
      if (req.query.userId) filters.userId = req.query.userId;

      const data = await bookingService.getAllBookings(orgId, filters);
      res.success(data, 'Bookings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.user?.orgId || req.query.orgId;
      const data = await bookingService.getBookingById(id, orgId);
      res.success(data, 'Booking retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const orgId = req.user?.orgId || req.body.orgId;
      const bookingData = { ...req.body, orgId };
      const data = await bookingService.createBooking(bookingData);
      res.success(data, 'Booking created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.user?.orgId || req.body.orgId;
      const { bookingStatus } = req.body;
      const data = await bookingService.updateBookingStatus(id, orgId, bookingStatus);
      res.success(data, 'Booking status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new BookingController();
