import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAssessments,
  createNewAssessment,
  modifyAssessment,
  clearAssessmentError,
  setActiveTemplate,
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
  const { assessmentsList, activeTemplate, loading, error } = useSelector(
    (state) => state.assessment
  );
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId);

  // 2. Memoized action dispatchers
  const loadAssessments = useCallback(
    (params = {}) => {
      const orgId = params.orgId || activeOrgId;
      return dispatch(fetchAssessments({ orgId, ...params }));
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

  return {
    // Redux Slice states
    assessmentsList,
    activeTemplate,
    loading,
    error,

    // Dispatcher methods
    loadAssessments,
    saveAssessment,
    editAssessment,
    selectTemplate,
    resetAssessmentError,
  };
};

export default useAssessment;
