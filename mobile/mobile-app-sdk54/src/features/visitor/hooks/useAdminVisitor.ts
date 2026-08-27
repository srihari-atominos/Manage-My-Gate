import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { selectActiveOrgId } from '../../auth/store/authSelectors';
import {
  fetchCommunityPasses,
  fetchAdminAnalytics,
  fetchBlacklist,
  addBlacklistEntry,
  removeBlacklistEntry,
  forceRevokeAdminPass,
  forceCheckoutAdminVisitor,
} from '../store/adminVisitorThunks';
import { visitorAdminService } from '../services/visitorAdminService';

export const useAdminVisitor = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeOrgId = useSelector(selectActiveOrgId);

  const { admin } = useSelector((state: RootState) => (state as any).visitorPass || { admin: {} });

  const loadCommunityPasses = useCallback(
    (params?: any) => {
      const orgId = params?.orgId || activeOrgId;
      if (!orgId) return;
      return dispatch(fetchCommunityPasses({ orgId, params }));
    },
    [dispatch, activeOrgId]
  );

  const loadAnalytics = useCallback(() => {
    if (!activeOrgId) return;
    return dispatch(fetchAdminAnalytics(activeOrgId));
  }, [dispatch, activeOrgId]);

  const loadBlacklist = useCallback(() => {
    if (!activeOrgId) return;
    return dispatch(fetchBlacklist(activeOrgId));
  }, [dispatch, activeOrgId]);

  const addToBlacklist = useCallback(
    (payload: { visitorName: string; phone?: string; idProofNumber?: string; reason: string }) => {
      if (!activeOrgId) return;
      return dispatch(addBlacklistEntry({ orgId: activeOrgId, ...payload }));
    },
    [dispatch, activeOrgId]
  );

  const removeFromBlacklist = useCallback(
    (id: string) => {
      return dispatch(removeBlacklistEntry(id));
    },
    [dispatch]
  );

  const forceRevoke = useCallback(
    (id: string, reason: string) => {
      return dispatch(forceRevokeAdminPass({ id, reason }));
    },
    [dispatch]
  );

  const forceCheckout = useCallback(
    (logId: string, reason?: string) => {
      return dispatch(forceCheckoutAdminVisitor({ logId, reason }));
    },
    [dispatch]
  );

  const createAdminPass = useCallback(
    async (payload: any) => {
      const enrichedPayload = { ...payload, orgId: payload?.orgId || activeOrgId };
      return await visitorAdminService.createAdminOverridePass(enrichedPayload);
    },
    [activeOrgId]
  );

  return {
    adminState: admin,
    communityPasses: admin?.communityPasses || [],
    blacklist: admin?.blacklist || [],
    analytics: admin?.analytics || null,
    pagination: admin?.pagination || { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 },
    status: admin?.status || 'idle',
    actionStatus: admin?.actionStatus || 'idle',
    error: admin?.error || null,

    // Dispatch methods
    loadCommunityPasses,
    loadAnalytics,
    loadBlacklist,
    addToBlacklist,
    removeFromBlacklist,
    forceRevoke,
    forceCheckout,
    createAdminPass,
  };
};

export default useAdminVisitor;
