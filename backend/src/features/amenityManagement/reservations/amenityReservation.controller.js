import amenityReservationService from './amenityReservation.service.js';
import amenityIdempotencyService from '../idempotency/amenityIdempotencyRecord.service.js';
import HttpError from '../../../utils/httpError.utils.js';
import { getPermissionsForUser } from '../../../middlewares/rbac.middleware.js';
import { mapPermission } from '../../../utils/permissionMapper.js';

/**
 * Resolves whether a user has administrative scope for amenity operations based on permissions.
 *
 * @param {object} user - The authenticated user object from req.user
 * @param {string[]} requiredPermissions - Required permission strings
 * @returns {Promise<boolean>} - True if user has administrative scope, false if resident-restricted
 */
const checkAmenityAdminScope = async (user, requiredPermissions = ['amenities:amenities', 'amenities:admin_calander']) => {
  if (!user) return false;

  // Platform and Organization-level super admins bypass permission checks
  if (
    user.isPlatform ||
    user.isPlatformSuperAdmin ||
    ['Super Admin', 'Platform Super Admin', 'Community Admin', 'Admin', 'SuperAdmin'].includes(user.role)
  ) {
    return true;
  }

  const normalizedRequired = requiredPermissions.map(mapPermission);

  // If user payload directly carries permissions (e.g., in JWT claims or mocks)
  if (Array.isArray(user.permissions)) {
    if (user.permissions.includes('*')) return true;
    const userPerms = user.permissions.map(mapPermission);
    if (normalizedRequired.some((reqPerm) => userPerms.includes(reqPerm))) {
      return true;
    }
  }

  // Dynamically resolve permissions from database via RBAC engine
  try {
    const normalizedUser = {
      ...user,
      id: user.id || user._id,
    };
    const permissions = await getPermissionsForUser(normalizedUser);
    if (Array.isArray(permissions)) {
      if (permissions.includes('*')) return true;
      const userPerms = permissions.map(mapPermission);
      return normalizedRequired.some((reqPerm) => userPerms.includes(reqPerm));
    }
  } catch (err) {
    console.error('[AmenityRBAC] Error resolving user permissions in reservation controller:', err.message);
  }

  return false;
};

export class AmenityReservationController {
  /**
   * Promotes an active hold into a confirmed or pending-approval reservation.
   */
  async confirm(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const residentId = req.user.id || req.user._id;
      const unitId = req.user.villaId || req.user.unitId || req.user.id || req.user._id;
      const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];

      const confirmParams = {
        holdId: req.body.holdId,
        orgId,
        residentId,
        unitId,
        paymentReference: req.body.paymentReference,
        notes: req.body.notes,
      };

      if (idempotencyKey) {
        const idempResult = await amenityIdempotencyService.executeWithIdempotency(
          {
            orgId,
            idempotencyKey,
            requestPayload: req.body,
          },
          async () => {
            const result = await amenityReservationService.confirmReservationFromHold(confirmParams);
            return { statusCode: 201, body: result };
          }
        );
        return res.success(idempResult.body, 'Reservation confirmed successfully', idempResult.statusCode);
      }

      const result = await amenityReservationService.confirmReservationFromHold(confirmParams);
      return res.success(result, 'Reservation confirmed successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Cancels an existing reservation.
   */
  async cancel(req, res, next) {
    try {
      const { reservationId } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const hasAdminScope = await checkAmenityAdminScope(req.user, ['amenities:amenities']);
      const { reason } = req.body;

      const reservation = await amenityReservationService.getReservationById(reservationId);
      if (!reservation || reservation.orgId.toString() !== orgId.toString()) {
        throw new HttpError(404, 'Reservation not found');
      }

      if (!hasAdminScope && reservation.residentId.toString() !== userId.toString()) {
        throw new HttpError(403, 'Forbidden. You do not have permission to cancel this reservation.');
      }

      const result = await amenityReservationService.cancelReservation({
        reservationId,
        orgId,
        residentId: reservation.residentId,
        cancelledBy: userId,
        cancellationReason: reason,
      });

      return res.success(result, 'Reservation cancelled successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Maker-checker review (Approve / Reject) an event reservation.
   */
  async review(req, res, next) {
    try {
      const { reservationId } = req.params;
      const orgId = req.tenant.orgId;
      const reviewerId = req.user.id || req.user._id;
      const { action, rejectionReason, notes } = req.body;

      const normalizedAction =
        action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : action;

      const result = await amenityReservationService.reviewEventReservation({
        reservationId,
        orgId,
        adminUserId: reviewerId,
        action: normalizedAction,
        notes: notes || rejectionReason,
      });

      return res.success(result.reservation || result, `Event reservation ${action.toLowerCase()}d successfully`);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Lists reservations with pagination, search, and multidimensional filters.
   */
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = Number(req.query.page) || 1;
      const limit = Math.min(100, Number(req.query.limit) || 10);

      // Check if user is administrative or resident-restricted
      const hasAdminScope = await checkAmenityAdminScope(req.user, ['amenities:admin_calander', 'amenities:amenities']);
      let effectiveResidentId = req.query.residentId;
      if (!hasAdminScope) {
        effectiveResidentId = req.user.id || req.user._id;
      }

      const result = await amenityReservationService.listReservations({
        orgId,
        page,
        limit,
        facilityId: req.query.facilityId,
        resourceId: req.query.resourceId,
        residentId: effectiveResidentId,
        unitId: req.query.unitId,
        bookingStatus: req.query.bookingStatus,
        paymentStatus: req.query.paymentStatus,
        approvalStatus: req.query.approvalStatus,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
        search: req.query.search,
      });

      return res.success(result, 'Reservations retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves single reservation by ID within organization and ownership boundaries.
   */
  async getById(req, res, next) {
    try {
      const { reservationId } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const hasAdminScope = await checkAmenityAdminScope(req.user, ['amenities:admin_calander', 'amenities:amenities']);

      const reservation = await amenityReservationService.getReservationById(reservationId);
      if (!reservation || reservation.orgId.toString() !== orgId.toString()) {
        throw new HttpError(404, 'Reservation not found');
      }

      if (!hasAdminScope && reservation.residentId.toString() !== userId.toString()) {
        throw new HttpError(403, 'Forbidden. You do not have permission to view this reservation.');
      }

      return res.success(reservation, 'Reservation retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves single reservation by tenant-scoped sequential reservation number.
   */
  async getByNumber(req, res, next) {
    try {
      const { reservationNumber } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const hasAdminScope = await checkAmenityAdminScope(req.user, ['amenities:admin_calander', 'amenities:amenities']);

      const reservation = await amenityReservationService.getReservationByNumber(orgId, reservationNumber);
      if (!reservation) {
        throw new HttpError(404, 'Reservation not found');
      }

      if (!hasAdminScope && reservation.residentId.toString() !== userId.toString()) {
        throw new HttpError(403, 'Forbidden. You do not have permission to view this reservation.');
      }

      return res.success(reservation, 'Reservation retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityReservationController = new AmenityReservationController();
export default amenityReservationController;
