import apiClient from '../../../services/apiClient';

export const visitorAdminService = {
  // 1. Fetch community-wide passes with optional filters (villaId, block, passType, search, page, limit)
  getCommunityPasses: async (orgId: string, params?: any) => {
    return await apiClient.get(`/visitor-pass/admin/org/${orgId}`, { params });
  },

  // 2. Admin Override Pass Creation (for community event / vendor / resident override)
  createAdminOverridePass: async (payload: any) => {
    return await apiClient.post('/visitor-pass/admin/override', payload);
  },

  // 3. Admin Force Revoke any pass with reason
  forceRevokePass: async (id: string, reason: string) => {
    // Fallback to standard status update since admin route doesn't exist
    return await apiClient.patch(`/visitor-pass/${id}/status`, { status: 'REVOKED', reason });
  },

  // 4. Admin Master Gate Approvals Stream
  getAllPendingWalkIns: async (orgId: string) => {
    return await apiClient.get(`/visitor-log/admin/org/${orgId}/pending-all`);
  },

  // 5. Admin Override Walk-in Approval / Rejection
  adminResolveWalkIn: async (id: string, action: 'APPROVE' | 'REJECT', notes?: string) => {
    return await apiClient.patch(`/visitor-log/admin/walk-in/${id}/resolve`, { action, notes });
  },

  // 6. Admin Gate Security Analytics & Check-in Trends
  getGateAnalytics: async (orgId: string, params?: any) => {
    return await apiClient.get(`/visitor-log/admin/analytics`, { params: { orgId, ...params } });
  },

  // 7. Community Visitor Blacklist Management
  getBlacklist: async (orgId: string) => {
    return await apiClient.get(`/visitor-blacklist/org/${orgId}`);
  },

  addToBlacklist: async (payload: { orgId: string; visitorName: string; phone?: string; idProofNumber?: string; reason: string }) => {
    return await apiClient.post('/visitor-blacklist', payload);
  },

  removeFromBlacklist: async (id: string) => {
    return await apiClient.delete(`/visitor-blacklist/${id}`);
  },

  // 8. Emergency Force Check-Out for stuck visitors inside
  forceCheckoutVisitor: async (logId: string, reason?: string) => {
    return await apiClient.patch(`/visitor-log/admin/${logId}/force-checkout`, { reason });
  },
};

export default visitorAdminService;
