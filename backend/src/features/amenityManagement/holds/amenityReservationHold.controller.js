import amenityReservationHoldService from './amenityReservationHold.service.js';
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
    console.error('[AmenityRBAC] Error resolving user permissions in hold controller:', err.message);
  }

  return false;
};

export class AmenityReservationHoldController {
  /**
   * Creates an ephemeral reservation hold.
   */
  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const residentId = req.user.id || req.user._id;
      const hasAdminScope = await checkAmenityAdminScope(req.user, ['amenities:amenities', 'amenities:admin_calander']);
      const unitId = (!hasAdminScope && (req.user.villaId || req.user.unitId)) ? (req.user.villaId || req.user.unitId) : (req.body.unitId || req.user.villaId || req.user.unitId || req.user.id);
      const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];

      const holdParams = {
        facilityId: req.body.facilityId,
        resourceId: req.body.resourceId,
        requestedStartDateTime: req.body.requestedStartDateTime,
        requestedEndDateTime: req.body.requestedEndDateTime,
        headcount: req.body.headcount,
        quantity: req.body.quantity,
        holdType: req.body.holdType,
        quotaLimit: req.body.quotaLimit,
        orgId,
        residentId,
        unitId,
      };

      if (idempotencyKey) {
        const idempResult = await amenityIdempotencyService.executeWithIdempotency(
          {
            orgId,
            idempotencyKey,
            requestPayload: req.body,
          },
          async () => {
            const result = await amenityReservationHoldService.createStandardHold(holdParams);
            return { statusCode: 201, body: result };
          }
        );
        return res.success(idempResult.body, 'Reservation hold created successfully', idempResult.statusCode);
      }

      const result = await amenityReservationHoldService.createStandardHold(holdParams);
      return res.success(result, 'Reservation hold created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves single hold by ID with tenant and ownership verification.
   */
  async getById(req, res, next) {
    try {
      const { holdId } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const hasAdminScope = await checkAmenityAdminScope(req.user, ['amenities:amenities', 'amenities:admin_calander']);
      const hold = await amenityReservationHoldService.getHoldById(holdId);

      if (!hold) {
        throw new HttpError(404, 'Reservation hold not found');
      }

      if (hold.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Reservation hold does not belong to this organization.');
      }

      if (!hasAdminScope && hold.residentId.toString() !== userId.toString()) {
        throw new HttpError(403, 'Forbidden. You do not have permission to view this hold.');
      }

      return res.success(hold, 'Reservation hold retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Explicitly expires an active hold early with tenant and ownership verification.
   */
  async expire(req, res, next) {
    try {
      const { holdId } = req.params;
      const orgId = req.tenant.orgId;
      const userId = req.user.id || req.user._id;
      const hasAdminScope = await checkAmenityAdminScope(req.user, ['amenities:amenities']);

      const hold = await amenityReservationHoldService.getHoldById(holdId);
      if (!hold) {
        throw new HttpError(404, 'Reservation hold not found');
      }

      if (hold.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Reservation hold does not belong to this organization.');
      }

      if (!hasAdminScope && hold.residentId.toString() !== userId.toString()) {
        throw new HttpError(403, 'Forbidden. You do not have permission to release this hold.');
      }

      const result = await amenityReservationHoldService.expireHold(holdId);
      return res.success(result, 'Reservation hold expired successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityReservationHoldController = new AmenityReservationHoldController();
export default amenityReservationHoldController;
