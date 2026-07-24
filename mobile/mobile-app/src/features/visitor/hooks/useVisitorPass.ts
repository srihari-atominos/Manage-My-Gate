import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  getPasses,
  getPassDetails,
  createPass,
  updatePassStatus,
  clearPassStatus,
  setActivePass,
  VisitorPass,
} from '../store/visitorPassSlice';

export const useVisitorPass = () => {
  const dispatch = useDispatch<AppDispatch>();

  // 1. Selector mapping
  const { passes, activePass, pagination, status, actionStatus, error } = useSelector(
    (state: RootState) => (state as any).visitorPass
  );
  
  // Retrieve organization ID from auth user state
  const activeOrgId = useSelector((state: RootState) => state.auth?.user?.orgId);

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
    pagination,
    status,
    actionStatus,
    error,

    // Dispatcher methods
    fetchPasses,
    fetchPassDetails,
    createNewPass,
    revokePass,
    resetPassStatus,
    selectPass,
  };
};

export default useVisitorPass;
