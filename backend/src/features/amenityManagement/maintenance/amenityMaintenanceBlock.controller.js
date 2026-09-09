import amenityMaintenanceBlockService from './amenityMaintenanceBlock.service.js';

export class AmenityMaintenanceBlockController {
  /**
   * Schedules a maintenance blackout window.
   */
  async schedule(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const result = await amenityMaintenanceBlockService.scheduleMaintenanceBlock({
        ...req.body,
        orgId,
      });

      return res.success(result, 'Maintenance block scheduled successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves maintenance blocks overlapping a given timeframe.
   */
  async getOverlapping(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { facilityId, resourceId, startDateTime, endDateTime } = req.query;

      const blocks = await amenityMaintenanceBlockService.getOverlappingBlocks({
        orgId,
        facilityId,
        resourceId: resourceId || null,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
      });

      return res.success(blocks, 'Overlapping maintenance blocks retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves single maintenance block by ID.
   */
  async getById(req, res, next) {
    try {
      const { blockId } = req.params;
      const block = await amenityMaintenanceBlockService.getMaintenanceBlockById(blockId);
      return res.success(block, 'Maintenance block retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Updates maintenance block lifecycle status.
   */
  async updateStatus(req, res, next) {
    try {
      const { blockId } = req.params;
      const { status } = req.body;

      const updated = await amenityMaintenanceBlockService.updateMaintenanceStatus(blockId, status);
      return res.success(updated, 'Maintenance block status updated successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityMaintenanceBlockController = new AmenityMaintenanceBlockController();
export default amenityMaintenanceBlockController;
