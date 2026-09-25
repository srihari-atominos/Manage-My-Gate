import bookingService from './booking.services.js';
import { checkIsAdmin } from '../../middlewares/rbac.middleware.js';
import HttpError from '../../utils/httpError.utils.js';

const hasBookingOperatorPermission = (req) => {
  const permissions = req.tenantPermissions || req.user?.permissions || [];
  return ['amenities:scanner', 'amenities:admin_calander', 'amenities:dashboard']
    .some((permission) => permissions.includes(permission));
};

const isBookingOwner = (booking, userId) => {
  const bookingUserId = booking?.userId?._id || booking?.userId;
  return Boolean(bookingUserId && userId && bookingUserId.toString() === userId.toString());
};

export class BookingController {
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant?.orgId;
      const filters = {};
      const isAdmin = await checkIsAdmin(req);
      // Residents can see only their own bookings. Operators retain the
      // existing community-wide list and optional user filter.
      if (isAdmin || hasBookingOperatorPermission(req)) {
        if (req.query.userId) filters.userId = req.query.userId;
      } else {
        filters.userId = req.user.id || req.user._id;
      }

      const data = await bookingService.getAllBookings(orgId, filters);
      res.success(data, 'Bookings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant?.orgId;
      const data = await bookingService.getBookingById(id, orgId);
      const isAdmin = await checkIsAdmin(req);
      if (!isAdmin && !hasBookingOperatorPermission(req) && !isBookingOwner(data, req.user.id || req.user._id)) {
        throw new HttpError(403, 'Forbidden. You can only view your own bookings.');
      }
      res.success(data, 'Booking retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const orgId = req.tenant?.orgId;
      const bookingData = {
        ...req.body,
        orgId,
        userId: req.user.id || req.user._id,
      };
      const data = await bookingService.createBooking(bookingData);
      res.success(data, 'Booking created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant?.orgId;
      const { bookingStatus } = req.body;
      const current = await bookingService.getBookingById(id, orgId);
      const isAdmin = await checkIsAdmin(req);
      const isOperator = hasBookingOperatorPermission(req);
      const isOwner = isBookingOwner(current, req.user.id || req.user._id);

      if (!isAdmin && !isOperator) {
        if (!isOwner || bookingStatus !== 'Cancelled') {
          throw new HttpError(403, 'Forbidden. You can only cancel your own booking.');
        }
      }
      const data = await bookingService.updateBookingStatus(id, orgId, bookingStatus);
      res.success(data, 'Booking status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new BookingController();
