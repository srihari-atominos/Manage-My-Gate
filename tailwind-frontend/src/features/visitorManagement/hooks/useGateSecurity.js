import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getActiveVisitors,
  processPreApproved,
  initiateWalkIn,
  checkoutVisitor,
  clearLogStatus
} from '../store/visitorLogSlice.js';

/**
 * Custom Hook: useGateSecurity
 * 
 * Sole bridge between UI components and Redux store for Gate Security & Entry/Exit Logs.
 * Conforms to the "Thin View" pattern.
 */
export const useGateSecurity = () => {
  const dispatch = useDispatch();

  // 1. Selector mapping
  const { activeVisitors, status, actionStatus, error } = useSelector(
    (state) => state.visitorLog
  );
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId);

  // 2. Action dispatchers
  const fetchInsideVisitors = useCallback(
    (orgId) => {
      const targetOrgId = orgId || activeOrgId;
      if (!targetOrgId) {
        console.warn('Cannot fetch inside visitors: activeOrganizationId is not defined.');
        return;
      }
      return dispatch(getActiveVisitors(targetOrgId));
    },
    [dispatch, activeOrgId]
  );

  const processQR = useCallback(
    (payload) => {
      return dispatch(processPreApproved(payload));
    },
    [dispatch]
  );

  const createWalkIn = useCallback(
    (payload) => {
      const targetOrgId = payload?.orgId || activeOrgId;
      const enrichedPayload = { ...payload, orgId: targetOrgId };
      return dispatch(initiateWalkIn(enrichedPayload));
    },
    [dispatch, activeOrgId]
  );

  const checkout = useCallback(
    (logId) => {
      return dispatch(checkoutVisitor(logId));
    },
    [dispatch]
  );

  const resetLogStatus = useCallback(
    () => {
      dispatch(clearLogStatus());
    },
    [dispatch]
  );

  return {
    // State properties
    activeVisitors,
    status,
    actionStatus,
    error,

    // Dispatcher methods
    fetchInsideVisitors,
    processQR,
    createWalkIn,
    checkout,
    resetLogStatus
  };
};

export default useGateSecurity;
