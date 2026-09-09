import amenityAccessPassService from './amenityAccessPass.service.js';

export class AmenityAccessPassController {
  /**
   * Turnstile or guard QR check-in validation.
   */
  async checkIn(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { rawToken, gateId } = req.body;

      const result = await amenityAccessPassService.validateAndRecordCheckIn({
        orgId,
        rawToken,
        gateId,
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
   * Retrieves passes associated with a reservation.
   */
  async getByReservation(req, res, next) {
    try {
      const { reservationId } = req.params;
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
