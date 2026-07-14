import visitorLogService from './visitorLog.service.js';

export class VisitorLogController {
  /**
   * Log entry for a pre-approved visitor pass.
   */
  async logPreApproved(req, res, next) {
    try {
      const { passId, guardId } = req.body;
      const data = await visitorLogService.logPreApprovedEntry(passId, guardId);
      res.success(data, 'Pre-approved visitor check-in logged successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate a walk-in check-in request.
   */
  async initiateWalkIn(req, res, next) {
    try {
      const data = await visitorLogService.initiateWalkInRequest(req.body);
      res.success(data, 'Walk-in visitor check-in request initiated', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resolve a pending walk-in check-in request.
   */
  async resolveWalkIn(req, res, next) {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const data = await visitorLogService.resolveWalkInRequest(id, action);
      res.success(data, `Walk-in visitor check-in request resolved as ${action} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record visitor checkout.
   */
  async checkout(req, res, next) {
    try {
      const { id } = req.params;
      const data = await visitorLogService.checkout(id);
      res.success(data, 'Visitor checked out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active entry logs (visitors currently inside).
   */
  async getInside(req, res, next) {
    try {
      const { orgId } = req.params;
      const data = await visitorLogService.getActiveLogsInside(orgId);
      res.success(data, 'Active logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending walk-in check-in requests.
   */
  async getPending(req, res, next) {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;
      
      const data = await visitorLogService.getPendingApprovals(orgId, userId);
      res.success(data, 'Pending approvals retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated visitor logs history for an organization.
   */
  async getHistory(req, res, next) {
    try {
      const { orgId } = req.params;
      const skip = parseInt(req.query.skip, 10) || 0;
      const limit = parseInt(req.query.limit, 10) || 10;
      
      const filter = {};
      if (req.query.status && req.query.status !== 'all') {
        filter.logStatus = req.query.status.toUpperCase();
      }
      if (req.query.entryType && req.query.entryType !== 'all') {
        filter.entryType = req.query.entryType.toUpperCase();
      }
      
      const data = await visitorLogService.getHistoryLogs(orgId, skip, limit, filter);
      res.success(data, 'Visitor logs history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new VisitorLogController();
