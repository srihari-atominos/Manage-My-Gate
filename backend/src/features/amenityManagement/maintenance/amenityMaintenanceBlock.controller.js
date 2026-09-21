import amenityMaintenanceBlockService from './amenityMaintenanceBlock.service.js';
import amenityIdempotencyService from '../idempotency/amenityIdempotencyRecord.service.js';

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
        resourceIds,
        title,
        maintenanceType,
        internalNotes,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        startDateTime,
        endDateTime,
        windows,
        isCompleteClosure,
        degradedCapacity,
        reason,
        conflictAction,
        resolutions,
      } = req.body;

      const result = await amenityMaintenanceBlockService.scheduleMaintenanceBlock({
        orgId,
        facilityId,
        resourceId: resourceId || null,
        resourceIds: resourceIds || [],
        title,
        maintenanceType,
        internalNotes,
        bufferBeforeMinutes: bufferBeforeMinutes !== undefined ? bufferBeforeMinutes : 0,
        bufferAfterMinutes: bufferAfterMinutes !== undefined ? bufferAfterMinutes : 0,
        startDateTime,
        endDateTime,
        windows: Array.isArray(windows) && windows.length > 0 ? windows : undefined,
        isCompleteClosure: isCompleteClosure !== undefined ? isCompleteClosure : true,
        degradedCapacity: degradedCapacity || 0,
        reason,
        conflictAction,
        resolutions: resolutions || [],
        cancelledBy: req.user?._id || req.user?.id,
      });

      return res.success(result, 'Maintenance block scheduled successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Previews the impact of a proposed maintenance block without modifying the database.
   */
  async getImpactPreview(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const {
        facilityId,
        resourceId,
        resourceIds,
        startDateTime,
        endDateTime,
        windows,
        bufferBeforeMinutes,
        bufferAfterMinutes,
      } = req.body;

      const preview = await amenityMaintenanceBlockService.getImpactPreview({
        orgId,
        facilityId,
        resourceId: resourceId || null,
        resourceIds: resourceIds || [],
        startDateTime,
        endDateTime,
        windows: Array.isArray(windows) && windows.length > 0 ? windows : undefined,
        bufferBeforeMinutes: bufferBeforeMinutes !== undefined ? bufferBeforeMinutes : 0,
        bufferAfterMinutes: bufferAfterMinutes !== undefined ? bufferAfterMinutes : 0,
      });

      return res.success(preview, 'Maintenance impact preview generated successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Discovers alternative available slots and sibling resources for an impacted booking/reservation.
   */
  async getAlternatives(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { facilityId, resourceId, originalStart, originalEnd, searchDaysAhead } = req.body;

      const alternatives = await amenityMaintenanceBlockService.findAlternativeSlots({
        orgId,
        facilityId,
        resourceId: resourceId || null,
        originalStart,
        originalEnd,
        searchDaysAhead: searchDaysAhead !== undefined ? parseInt(searchDaysAhead, 10) : 7,
      });

      return res.success(alternatives, 'Alternative slots discovered successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Resolves pending maintenance impacts for an existing maintenance block.
   */
  async resolveImpact(req, res, next) {
    try {
      const { blockId } = req.params;
      const orgId = req.tenant.orgId;
      const { resolutions } = req.body;

      const result = await amenityMaintenanceBlockService.resolveMaintenanceImpact({
        blockId,
        orgId,
        resolutions: resolutions || [],
        resolvedBy: req.user?._id || req.user?.id,
      });

      return res.success(result, 'Maintenance impact resolved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves all impact history records for a maintenance block.
   */
  async getImpacts(req, res, next) {
    try {
      const { blockId } = req.params;
      const orgId = req.tenant.orgId;

      const impacts = await amenityMaintenanceBlockService.getImpactsForBlock(blockId, orgId);
      return res.success(impacts, 'Maintenance impacts retrieved successfully');
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
      const { status, actualCompletedAt, completedBy, completionNotes } = req.body;

      const updated = await amenityMaintenanceBlockService.updateMaintenanceStatus(
        blockId,
        orgId,
        status,
        undefined,
        {
          actualCompletedAt,
          completedBy: completedBy || req.user?._id || req.user?.id,
          completionNotes,
        }
      );
      return res.success(updated, 'Maintenance block status updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Extends maintenance block window and re-checks for conflicting reservations.
   */
  async extend(req, res, next) {
    try {
      const { blockId } = req.params;
      const orgId = req.tenant.orgId;
      const { newEndDateTime, conflictAction, resolutions } = req.body;

      const result = await amenityMaintenanceBlockService.extendMaintenanceBlock({
        blockId,
        orgId,
        newEndDateTime,
        conflictAction,
        resolutions: resolutions || [],
        cancelledBy: req.user?._id || req.user?.id,
      });

      return res.success(result, 'Maintenance block extended successfully');
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
  /**
   * Previews a recurring maintenance series and all occurrence conflicts.
   */
  async previewRecurring(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const {
        facilityId,
        resourceId,
        resourceIds,
        title,
        description,
        reason,
        maintenanceType,
        startDateTime,
        endDateTime,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        recurrence,
      } = req.body;

      const result = await amenityMaintenanceBlockService.previewRecurringMaintenance({
        orgId,
        facilityId,
        resourceId: resourceId || null,
        resourceIds: resourceIds || [],
        title,
        description,
        reason,
        maintenanceType,
        startDateTime,
        endDateTime,
        bufferBeforeMinutes: bufferBeforeMinutes !== undefined ? bufferBeforeMinutes : 0,
        bufferAfterMinutes: bufferAfterMinutes !== undefined ? bufferAfterMinutes : 0,
        recurrence,
      });

      return res.success(result, 'Recurring maintenance preview generated successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Atomically schedules a recurring maintenance series and resolves any conflicts.
   */
  async scheduleRecurring(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const {
        facilityId,
        resourceId,
        resourceIds,
        title,
        description,
        reason,
        maintenanceType,
        internalNotes,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        startDateTime,
        endDateTime,
        isCompleteClosure,
        degradedCapacity,
        recurrence,
        conflictAction,
        impactResolutions,
        resolutions,
      } = req.body;

      const result = await amenityMaintenanceBlockService.scheduleRecurringMaintenance({
        orgId,
        facilityId,
        resourceId: resourceId || null,
        resourceIds: resourceIds || [],
        title,
        description,
        reason,
        maintenanceType,
        internalNotes,
        bufferBeforeMinutes: bufferBeforeMinutes !== undefined ? bufferBeforeMinutes : 0,
        bufferAfterMinutes: bufferAfterMinutes !== undefined ? bufferAfterMinutes : 0,
        startDateTime,
        endDateTime,
        isCompleteClosure: isCompleteClosure !== undefined ? isCompleteClosure : true,
        degradedCapacity: degradedCapacity || 0,
        recurrence,
        conflictAction,
        impactResolutions,
        resolutions,
        cancelledBy: req.user?._id || req.user?.id,
      });

      return res.success(result, 'Recurring maintenance series scheduled successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves recurring maintenance series details.
   */
  async getRecurringSeries(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { seriesId } = req.params;

      const result = await amenityMaintenanceBlockService.getRecurringSeriesById(seriesId, orgId);
      return res.success(result, 'Recurring maintenance series retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves paginated occurrences for a recurring maintenance series.
   */
  async getRecurringSeriesOccurrences(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { seriesId } = req.params;
      const { page, limit } = req.query;

      const result = await amenityMaintenanceBlockService.listSeriesOccurrences({
        seriesId,
        orgId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      return res.success(result, 'Recurring maintenance series occurrences retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Declares emergency maintenance on a facility or resource(s).
   * Takes effect immediately, setting status to IN_PROGRESS.
   */
  async declareEmergency(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const {
        facilityId,
        resourceId,
        resourceIds,
        title,
        reason,
        maintenanceType,
        internalNotes,
        endDateTime,
        bufferAfterMinutes,
        conflictAction,
        resolutions,
      } = req.body;

      const declareParams = {
        orgId,
        facilityId,
        resourceId: resourceId || null,
        resourceIds: resourceIds || [],
        title,
        reason,
        maintenanceType: maintenanceType || 'REPAIR',
        internalNotes,
        endDateTime,
        bufferAfterMinutes: bufferAfterMinutes !== undefined ? bufferAfterMinutes : 0,
        conflictAction: conflictAction || 'CANCEL_AND_PROCEED',
        resolutions: resolutions || [],
        cancelledBy: req.user?._id || req.user?.id,
      };

      const idempotencyKey = req.headers['x-idempotency-key'];
      if (idempotencyKey) {
        const idempResult = await amenityIdempotencyService.executeWithIdempotency(
          {
            orgId,
            idempotencyKey,
            requestPayload: req.body,
          },
          async () => {
            const result = await amenityMaintenanceBlockService.declareEmergencyMaintenance(declareParams);
            return { statusCode: 201, body: result };
          }
        );
        return res.success(idempResult.body, 'Emergency maintenance declared successfully', idempResult.statusCode);
      }

      const result = await amenityMaintenanceBlockService.declareEmergencyMaintenance(declareParams);
      return res.success(result, 'Emergency maintenance declared successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Deletes a maintenance block by ID within organization.
   */
  async delete(req, res, next) {
    try {
      const blockId = req.params.blockId || req.params.id;
      const orgId = req.tenant.orgId;

      const result = await amenityMaintenanceBlockService.deleteMaintenanceBlock(blockId, orgId);
      return res.success(result, 'Maintenance block deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityMaintenanceBlockController = new AmenityMaintenanceBlockController();
export default amenityMaintenanceBlockController;
