import emergencySosService from './emergencySos.services.js';
import HttpError from '../../utils/httpError.utils.js';

class EmergencySosController {
  async triggerSos(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.activeOrgId || req.user?.orgId;

      if (!orgId) {
        throw new HttpError(403, 'Organization tenant context required.');
      }

      const alert = await emergencySosService.triggerSos(userId, orgId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Emergency SOS alert dispatched immediately to security team.',
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveSos(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.activeOrgId || req.user?.orgId;

      if (!orgId) {
        throw new HttpError(403, 'Organization tenant context required.');
      }

      const activeAlert = await emergencySosService.getActiveSos(userId, orgId);

      return res.json({
        success: true,
        data: activeAlert,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelSos(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.activeOrgId || req.user?.orgId;
      const { id } = req.params;

      const cancelled = await emergencySosService.cancelSos(id, userId, orgId);

      return res.json({
        success: true,
        message: 'Emergency alert cancelled.',
        data: cancelled,
      });
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeSos(req, res, next) {
    try {
      const guardUserId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.activeOrgId || req.user?.orgId;
      const { id } = req.params;

      const acknowledged = await emergencySosService.acknowledgeSos(id, guardUserId, orgId);

      return res.json({
        success: true,
        message: 'Emergency alert acknowledged by security team.',
        data: acknowledged,
      });
    } catch (error) {
      next(error);
    }
  }

  async resolveSos(req, res, next) {
    try {
      const actorId = req.user?.id || req.user?._id;
      const orgId = req.tenant?.orgId || req.user?.activeOrgId || req.user?.orgId;
      const { id } = req.params;
      const { resolutionNotes } = req.body;

      const resolved = await emergencySosService.resolveSos(id, actorId, orgId, resolutionNotes);

      return res.json({
        success: true,
        message: 'Emergency alert marked as resolved.',
        data: resolved,
      });
    } catch (error) {
      next(error);
    }
  }

  async listAlerts(req, res, next) {
    try {
      const orgId = req.tenant?.orgId || req.user?.activeOrgId || req.user?.orgId;
      if (!orgId) {
        throw new HttpError(403, 'Organization tenant context required.');
      }

      const result = await emergencySosService.listSosAlerts(orgId, req.query);

      return res.json({
        success: true,
        data: result.records,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new EmergencySosController();
