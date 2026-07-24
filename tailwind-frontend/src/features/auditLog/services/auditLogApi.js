import apiClient from '../../../services/apiClient.js';

/**
 * Audit Log API service to fetch system security events
 */
export const fetchAuditLogs = async (page = 1, limit = 10) => {
  return await apiClient.get('/audit-logs', {
    params: { page, limit },
  });
};

export default {
  fetchAuditLogs,
};
