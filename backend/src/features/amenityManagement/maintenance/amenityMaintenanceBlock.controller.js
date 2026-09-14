import amenityMaintenanceBlockService from './amenityMaintenanceBlock.service.js';

export class AmenityMaintenanceBlockController {
  /**
   * Schedules a maintenance blackout window.
   */
  async schedule(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const {
        facilityId,
        resourceId,
        startDateTime,
        endDateTime,
        isCompleteClosure,
        degradedCapacity,
        reason,
        conflictAction,
      } = req.body;

      const result = await amenityMaintenanceBlockService.scheduleMaintenanceBlock({
        orgId,
        facilityId,
        resourceId: resourceId || null,
        startDateTime,
        endDateTime,
        isCompleteClosure: isCompleteClosure !== undefined ? isCompleteClosure : true,
        degradedCapacity: degradedCapacity || 0,
        reason,
        conflictAction,
        cancelledBy: req.user?._id || req.user?.id,
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
   * Retrieves single maintenance block by ID within organization.
   */
  async getById(req, res, next) {
    try {
      const { blockId } = req.params;
      const orgId = req.tenant.orgId;
      const block = await amenityMaintenanceBlockService.getMaintenanceBlockById(blockId, orgId);
      return res.success(block, 'Maintenance block retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Updates maintenance block lifecycle status within organization.
   */
  async updateStatus(req, res, next) {
    try {
      const { blockId } = req.params;
      const orgId = req.tenant.orgId;
      const { status } = req.body;

      const updated = await amenityMaintenanceBlockService.updateMaintenanceStatus(blockId, orgId, status);
      return res.success(updated, 'Maintenance block status updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves paginated list of maintenance blocks for the organization.
   */
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { facilityId, status, page, limit } = req.query;

      const result = await amenityMaintenanceBlockService.listMaintenanceBlocks({
        orgId,
        facilityId,
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      return res.success(result, 'Maintenance blocks retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityMaintenanceBlockController = new AmenityMaintenanceBlockController();
export default amenityMaintenanceBlockController;
