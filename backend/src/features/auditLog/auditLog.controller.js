import auditLogService from './auditLog.services.js';

export class AuditLogController {
  /**
   * Retrieves and returns paginated list of system audit logs
   */
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const data = await auditLogService.getLogs(orgId, page, limit);
      res.success(data, 'Audit logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditLogController();
