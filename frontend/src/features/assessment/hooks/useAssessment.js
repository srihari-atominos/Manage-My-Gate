import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAssessments,
  createNewAssessment,
  modifyAssessment,
  clearAssessmentError,
  setActiveTemplate,
  deleteAssessmentTemplate,
  runBillingCycle,
} from '../store/assessmentSlice.js';

/**
 * Custom Hook: useAssessment
 * 
 * Sole controller bridge between visual UI components and Redux Toolkit state.
 * Conforms to the "Thin View" pattern by encapsulating all dispatch actions.
 */
export const useAssessment = () => {
  const dispatch = useDispatch();

  // 1. Selector mapping
  const { assessmentsList, activeTemplate, pagination, loading, error } = useSelector(
    (state) => state.assessment
  );
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId);

  // 2. Memoized action dispatchers
  const loadAssessments = useCallback(
    (params = {}) => {
      const orgId = params.orgId || activeOrgId;
      const page = params.page || 1;
      const limit = params.limit || 3;
      return dispatch(fetchAssessments({ orgId, page, limit, ...params }));
    },
    [dispatch, activeOrgId]
  );

  const saveAssessment = useCallback(
    (data) => {
      const orgId = data.communityId || activeOrgId;
      const enriched = { ...data, communityId: orgId };
      return dispatch(createNewAssessment(enriched));
    },
    [dispatch, activeOrgId]
  );

  const editAssessment = useCallback(
    (id, data) => {
      return dispatch(modifyAssessment({ id, payload: data }));
    },
    [dispatch]
  );

  const selectTemplate = useCallback(
    (template) => {
      dispatch(setActiveTemplate(template));
    },
    [dispatch]
  );

  const resetAssessmentError = useCallback(
    () => {
      dispatch(clearAssessmentError());
    },
    [dispatch]
  );

  const deleteTemplate = useCallback(
    (id) => {
      return dispatch(deleteAssessmentTemplate(id));
    },
    [dispatch]
  );

  const triggerBilling = useCallback(
    (id) => {
      return dispatch(runBillingCycle(id));
    },
    [dispatch]
  );

  return {
    // Redux Slice states
    assessmentsList,
    activeTemplate,
    pagination,
    loading,
    error,

    // Dispatcher methods
    loadAssessments,
    saveAssessment,
    editAssessment,
    deleteTemplate,
    selectTemplate,
    resetAssessmentError,
    triggerBilling,
  };
};

export default useAssessment;
