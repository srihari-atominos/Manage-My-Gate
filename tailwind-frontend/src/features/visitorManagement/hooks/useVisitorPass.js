import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getPasses,
  getPassDetails,
  createPass,
  updatePassStatus,
  clearPassStatus
} from '../store/visitorPassSlice.js';

/**
 * Custom Hook: useVisitorPass
 * 
 * Sole bridge between UI components and Redux store for Visitor Pass state management.
 * Conforms to the "Thin View" pattern.
 */
export const useVisitorPass = () => {
  const dispatch = useDispatch();

  // 1. Selector mapping
  const { passes, activePass, pagination, status, actionStatus, error } = useSelector(
    (state) => state.visitorPass
  );
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId);

  // 2. Action dispatchers wrapped in useCallback to prevent unnecessary re-renders in visual components
  const fetchPasses = useCallback(
    (params) => {
      const orgId = params?.orgId || activeOrgId;
      if (!orgId) {
        console.warn('Cannot fetch passes: activeOrganizationId is not defined.');
        return;
      }
      return dispatch(getPasses({ orgId, params }));
    },
    [dispatch, activeOrgId]
  );

  const fetchPassDetails = useCallback(
    (id) => {
      return dispatch(getPassDetails(id));
    },
    [dispatch]
  );

  const createNewPass = useCallback(
    (payload) => {
      const orgId = payload?.orgId || activeOrgId;
      const enrichedPayload = { ...payload, orgId };
      return dispatch(createPass(enrichedPayload));
    },
    [dispatch, activeOrgId]
  );

  const revokePass = useCallback(
    (id) => {
      return dispatch(updatePassStatus({ id, status: 'REVOKED' }));
    },
    [dispatch]
  );

  const resetPassStatus = useCallback(
    () => {
      dispatch(clearPassStatus());
    },
    [dispatch]
  );

  return {
    // State properties
    passes,
    activePass,
    pagination,
    status,
    actionStatus,
    error,

    // Dispatcher methods
    fetchPasses,
    fetchPassDetails,
    createNewPass,
    revokePass,
    resetPassStatus
  };
};

export default useVisitorPass;
