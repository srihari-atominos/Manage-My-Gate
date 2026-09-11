import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchActivePolls,
  fetchClosedPolls,
  fetchMyPolls,
  fetchPollById,
  castVoteThunk,
  createPollThunk,
  closePollThunk,
  publishPollThunk,
  deletePollThunk,
  fetchPollResults,
  fetchPollVoters,
  selectPoll as selectPollAction,
  clearPollErrors as clearPollErrorsAction,
  clearPollSuccess as clearPollSuccessAction,
} from '../store/pollSlice';

/**
 * usePolls Controller Hook
 * Exposes Redux state and memoized dispatch functions to keep visual components thin.
 */
export function usePolls() {
  const dispatch = useDispatch();

  // State selectors
  const activePolls = useSelector((state) => state.poll?.activePolls?.data || []);
  const activeTotal = useSelector((state) => state.poll?.activePolls?.total || 0);
  const activeLoading = useSelector((state) => state.poll?.activePolls?.loading || false);

  const closedPolls = useSelector((state) => state.poll?.closedPolls?.data || []);
  const closedTotal = useSelector((state) => state.poll?.closedPolls?.total || 0);
  const closedLoading = useSelector((state) => state.poll?.closedPolls?.loading || false);

  const myPolls = useSelector((state) => state.poll?.myPolls?.data || []);
  const myTotal = useSelector((state) => state.poll?.myPolls?.total || 0);
  const myLoading = useSelector((state) => state.poll?.myPolls?.loading || false);

  const selectedPoll = useSelector((state) => state.poll?.selectedPoll || null);
  const results = useSelector((state) => state.poll?.results || null);
  const voters = useSelector((state) => state.poll?.voters || null);

  const loading = useSelector((state) => state.poll?.loading || false);
  const voting = useSelector((state) => state.poll?.voting || false);
  const submitting = useSelector((state) => state.poll?.submitting || false);
  const error = useSelector((state) => state.poll?.error || null);
  const success = useSelector((state) => state.poll?.success || null);

  // User and RBAC authorization
  const user = useSelector((state) => state.auth?.user || null);

  const checkPermission = useCallback(
    (permissionName) => {
      if (!user) return false;
      if (user.role === 'Super Admin' || user.role === 'Platform Super Admin') return true;
      if (user.role === 'Admin' || user.role === 'Community Admin') return true;
      return !!(user.permissions && user.permissions.includes(permissionName));
    },
    [user]
  );

  const canCreate =
    checkPermission('polls:create') ||
    checkPermission('notices:manage_notices') ||
    checkPermission('polls:manage');
  const canClose =
    checkPermission('polls:close') ||
    checkPermission('notices:manage_notices') ||
    checkPermission('polls:manage');
  const canDelete =
    checkPermission('polls:delete') ||
    checkPermission('notices:manage_notices') ||
    checkPermission('polls:manage');
  const canViewVoters =
    checkPermission('polls:view_voters') ||
    checkPermission('notices:manage_notices') ||
    checkPermission('polls:manage');
  const canExport =
    checkPermission('polls:export') ||
    checkPermission('notices:manage_notices') ||
    checkPermission('polls:manage');
  const canVote = true; // All residents are eligible to participate subject to targetAudience backend checks

  // Dispatchers
  const loadActivePolls = useCallback(
    (params = {}) => {
      return dispatch(fetchActivePolls(params));
    },
    [dispatch]
  );

  const loadClosedPolls = useCallback(
    (params = {}) => {
      return dispatch(fetchClosedPolls(params));
    },
    [dispatch]
  );

  const loadMyPolls = useCallback(
    (params = {}) => {
      return dispatch(fetchMyPolls(params));
    },
    [dispatch]
  );

  const loadPollById = useCallback(
    (id) => {
      return dispatch(fetchPollById(id));
    },
    [dispatch]
  );

  const castVote = useCallback(
    (id, voteData) => {
      return dispatch(castVoteThunk({ id, voteData }));
    },
    [dispatch]
  );

  const createNewPoll = useCallback(
    (pollData) => {
      return dispatch(createPollThunk(pollData));
    },
    [dispatch]
  );

  const closeExistingPoll = useCallback(
    (id) => {
      return dispatch(closePollThunk(id));
    },
    [dispatch]
  );

  const publishExistingPoll = useCallback(
    (id) => {
      return dispatch(publishPollThunk(id));
    },
    [dispatch]
  );

  const removePoll = useCallback(
    (id) => {
      return dispatch(deletePollThunk(id));
    },
    [dispatch]
  );

  const loadResults = useCallback(
    (id) => {
      return dispatch(fetchPollResults(id));
    },
    [dispatch]
  );

  const loadVoters = useCallback(
    (id) => {
      return dispatch(fetchPollVoters(id));
    },
    [dispatch]
  );

  const selectCurrentPoll = useCallback(
    (poll) => {
      dispatch(selectPollAction(poll));
    },
    [dispatch]
  );

  const clearErrors = useCallback(() => {
    dispatch(clearPollErrorsAction());
  }, [dispatch]);

  const clearSuccess = useCallback(() => {
    dispatch(clearPollSuccessAction());
  }, [dispatch]);

  return {
    // Selectors
    activePolls,
    activeTotal,
    activeLoading,
    closedPolls,
    closedTotal,
    closedLoading,
    myPolls,
    myTotal,
    myLoading,
    selectedPoll,
    results,
    voters,
    loading,
    voting,
    submitting,
    error,
    success,
    user,
    canCreate,
    canClose,
    canDelete,
    canViewVoters,
    canExport,
    canVote,

    // Dispatchers
    loadActivePolls,
    loadClosedPolls,
    loadMyPolls,
    loadPollById,
    castVote,
    createNewPoll,
    closeExistingPoll,
    publishExistingPoll,
    removePoll,
    loadResults,
    loadVoters,
    selectCurrentPoll,
    clearErrors,
    clearSuccess,
  };
}

export default usePolls;
