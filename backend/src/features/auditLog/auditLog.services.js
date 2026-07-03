import auditLogRepository from './auditLog.repository.js';

export class AuditLogService {
  /**
   * Dispatches event details to repository to insert an audit entry
   */
  async logEvent(logData) {
    return await auditLogRepository.create(logData);
  }

  /**
   * Fetches paginated audit logs for view dashboards
   */
  async getLogs(page = 1, limit = 10) {
    return await auditLogRepository.findAllPaginated(Number(page), Number(limit));
  }
}

export default new AuditLogService();
