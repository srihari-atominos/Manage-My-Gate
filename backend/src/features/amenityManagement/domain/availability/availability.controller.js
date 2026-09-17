import availabilityService from './availability.service.js';

export class AvailabilityController {
  /**
   * Checks archetype-aware availability for a requested window.
   */
  async check(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { facilityId, resourceId, startDateTime, endDateTime, requestedQuantity } = req.query;

      const result = await availabilityService.checkAvailability({
        orgId,
        facilityId,
        resourceId: resourceId || null,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        requestedQuantity: Number(requestedQuantity) || 1,
      });

      return res.success(result, 'Availability evaluated successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const availabilityController = new AvailabilityController();
export default availabilityController;
