import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { useVisitorSocket } from './useVisitorSocket';
import {
  getPasses,
  getPassDetails,
  createPass,
  updatePassStatus,
  clearPassStatus,
  setActivePass,
  fetchDashboardSummary,
  fetchPendingWalkIns,
  resolveWalkInRequest,
  VisitorPass,
} from '../store/visitorPassSlice';

export const useVisitorPass = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Activate real-time Visitor Management Socket.IO event listeners
  useVisitorSocket();

  // 1. Selector mapping
  const { passes, activePass, dashboard, walkIns, pagination, status, actionStatus, error } = useSelector(
    (state: RootState) => (state as any).visitorPass
  );

  // Retrieve organization ID from auth user state with fallback logic
  const activeOrgId = useSelector((state: RootState) => {
    const user = (state as any).auth?.user;
    return (
      user?.orgId ||
      user?.organizationId ||
      user?.org?._id ||
      user?.organization?._id ||
      (Array.isArray(user?.availableWorkspaces) && user?.availableWorkspaces[0]?.orgId) ||
      (Array.isArray(user?.availableWorkspaces) && user?.availableWorkspaces[0]?._id) ||
      ''
    );
  });

  // 2. Action dispatchers wrapped in useCallback
  const fetchPasses = useCallback(
    (params?: any) => {
      const orgId = params?.orgId || activeOrgId;
      if (!orgId) {
        console.warn('Cannot fetch passes: organization context is not loaded.');
        return;
      }
      return dispatch(getPasses({ orgId, params }));
    },
    [dispatch, activeOrgId]
  );

  const fetchDashboardData = useCallback(
    (orgIdParam?: string) => {
      const orgId = orgIdParam || activeOrgId;
      if (!orgId) {
        console.warn('Cannot fetch dashboard summary: organization context is not loaded.');
        return;
      }
      return dispatch(fetchDashboardSummary(orgId));
    },
    [dispatch, activeOrgId]
  );

  const loadPendingWalkIns = useCallback(
    (orgIdParam?: string) => {
      const orgId = orgIdParam || activeOrgId;
      if (!orgId) {
        console.warn('Cannot fetch pending walk-ins: organization context is not loaded.');
        return;
      }
      return dispatch(fetchPendingWalkIns(orgId));
    },
    [dispatch, activeOrgId]
  );

  const resolveWalkIn = useCallback(
    (id: string, action: 'APPROVE' | 'REJECT') => {
      return dispatch(resolveWalkInRequest({ id, action }));
    },
    [dispatch]
  );

  const fetchPassDetails = useCallback(
    (id: string) => {
      return dispatch(getPassDetails(id));
    },
    [dispatch]
  );

  const createNewPass = useCallback(
    (payload: any) => {
      const orgId = payload?.orgId || activeOrgId;
      const enrichedPayload = { ...payload, orgId };
      return dispatch(createPass(enrichedPayload));
    },
    [dispatch, activeOrgId]
  );

  const revokePass = useCallback(
    (id: string) => {
      return dispatch(updatePassStatus({ id, status: 'REVOKED' }));
    },
    [dispatch]
  );

  const resetPassStatus = useCallback(() => {
    dispatch(clearPassStatus());
  }, [dispatch]);

  const selectPass = useCallback(
    (pass: VisitorPass | null) => {
      dispatch(setActivePass(pass));
    },
    [dispatch]
  );

  return {
    // State properties
    passes,
    activePass,
    dashboard,
    walkIns,
    pagination,
    status,
    actionStatus,
    error,

    // Dispatcher methods
    fetchPasses,
    fetchDashboardData,
    loadPendingWalkIns,
    resolveWalkIn,
    fetchPassDetails,
    createNewPass,
    revokePass,
    resetPassStatus,
    selectPass,
  };
};

export default useVisitorPass;
