import amenityReservationHoldService from './amenityReservationHold.service.js';
import amenityIdempotencyService from '../idempotency/amenityIdempotencyRecord.service.js';
import HttpError from '../../../utils/httpError.utils.js';

export class AmenityReservationHoldController {
  /**
   * Creates an ephemeral reservation hold.
   */
  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const residentId = req.user.id || req.user._id;
      const unitId = req.body.unitId || req.user.villaId || req.user.unitId || req.user.id || req.user._id;
      const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];

      const holdParams = {
        ...req.body,
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
   * Retrieves single hold by ID with tenant isolation verification.
   */
  async getById(req, res, next) {
    try {
      const { holdId } = req.params;
      const orgId = req.tenant.orgId;
      const hold = await amenityReservationHoldService.getHoldById(holdId);

      if (!hold) {
        throw new HttpError(404, 'Reservation hold not found');
      }

      if (hold.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Reservation hold does not belong to this organization.');
      }

      return res.success(hold, 'Reservation hold retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Explicitly expires an active hold early.
   */
  async expire(req, res, next) {
    try {
      const { holdId } = req.params;
      const orgId = req.tenant.orgId;

      const hold = await amenityReservationHoldService.getHoldById(holdId);
      if (!hold) {
        throw new HttpError(404, 'Reservation hold not found');
      }

      if (hold.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Reservation hold does not belong to this organization.');
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
