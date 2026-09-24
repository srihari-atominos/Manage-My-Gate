import amenityAccessPassService from './amenityAccessPass.service.js';
import amenityReservationService from '../reservations/amenityReservation.service.js';
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
const checkAmenityAdminScope = async (user, requiredPermissions = ['amenities:admin_calander', 'amenities:manage_bookings', 'amenities:scanner']) => {
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
    console.error('[AmenityRBAC] Error resolving user permissions in pass controller:', err.message);
  }

  return false;
};

export class AmenityAccessPassController {
  /**
   * Turnstile or guard QR check-in validation.
   */
  async checkIn(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { rawToken, gateId } = req.body;
      const guardId = req.user?.id || req.user?._id;

      const result = await amenityAccessPassService.validateAndRecordCheckIn({
        orgId,
        rawToken,
        gateId,
        guardId,
      });

      return res.success(result, 'Check-in validated and recorded successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Check-out and physical asset inspection.
   */
  async checkOut(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { rawToken, inspectionDetails } = req.body;

      const result = await amenityAccessPassService.recordCheckOut({
        orgId,
        rawToken,
        inspectionDetails,
      });

      return res.success(result, 'Check-out recorded successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves passes associated with a reservation with tenant and ownership verification.
   */
  async getByReservation(req, res, next) {
    try {
      const { reservationId } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const hasAdminScope = await checkAmenityAdminScope(req.user, ['amenities:admin_calander', 'amenities:manage_bookings', 'amenities:scanner']);

      const reservation = await amenityReservationService.getReservationById(reservationId);
      if (!reservation || reservation.orgId.toString() !== orgId.toString()) {
        throw new HttpError(404, 'Reservation not found');
      }

      const isAuthorized = await amenityReservationService.canUserAccessReservation(req.user, reservation);
      if (!isAuthorized) {
        throw new HttpError(403, 'Forbidden. You do not have permission to view passes for this reservation.');
      }

      const passes = await amenityAccessPassService.getPassesByReservationId(reservationId);
      return res.success(passes, 'Access passes retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Administrative pass revocation.
   */
  async revoke(req, res, next) {
    try {
      const { passId } = req.params;
      const orgId = req.tenant.orgId;
      const { reason } = req.body;

      const result = await amenityAccessPassService.revokePass(passId, orgId, reason);
      return res.success(result, 'Access pass revoked successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityAccessPassController = new AmenityAccessPassController();
export default amenityAccessPassController;
