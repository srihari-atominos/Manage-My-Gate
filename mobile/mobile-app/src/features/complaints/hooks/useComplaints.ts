import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchComplaints as fetchComplaintsThunk,
  fetchComplaintDetails as fetchComplaintDetailsThunk,
  createComplaint as createComplaintThunk,
  assignTechnician as assignTechnicianThunk,
  acceptAssignment as acceptAssignmentThunk,
  rejectAssignment as rejectAssignmentThunk,
  startWork as startWorkThunk,
  pauseWork as pauseWorkThunk,
  resumeWork as resumeWorkThunk,
  markWorkCompleted as markWorkCompletedThunk,
  confirmCompletion as confirmCompletionThunk,
  addComplaintComment as addComplaintCommentThunk,
  addFeedback as addFeedbackThunk,
  fetchDashboardAnalytics as fetchDashboardAnalyticsThunk,
  updateComplaintStatus as updateComplaintStatusThunk,
  clearComplaintErrors as clearComplaintErrorsAction,
} from '../store/complaintSlice';
import { AssignTechnicianPayload } from '../types';

export const useComplaints = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { list, pagination, currentComplaint, dashboardAnalytics, status, error } = useSelector(
    (state: RootState) => (state as any).complaints || {}
  );

  const getComplaints = useCallback(
    (params?: any) => {
      return dispatch(fetchComplaintsThunk(params));
    },
    [dispatch]
  );

  const getComplaintDetails = useCallback(
    (id: string) => {
      return dispatch(fetchComplaintDetailsThunk(id));
    },
    [dispatch]
  );

  const raiseComplaint = useCallback(
    (data: any) => {
      return dispatch(createComplaintThunk(data)).unwrap();
    },
    [dispatch]
  );

  const assignTech = useCallback(
    (id: string, data: AssignTechnicianPayload) => {
      return dispatch(assignTechnicianThunk({ id, data })).unwrap();
    },
    [dispatch]
  );

  const acceptAssign = useCallback(
    (id: string) => {
      return dispatch(acceptAssignmentThunk(id)).unwrap();
    },
    [dispatch]
  );

  const rejectAssign = useCallback(
    (id: string, reason: string) => {
      return dispatch(rejectAssignmentThunk({ id, reason })).unwrap();
    },
    [dispatch]
  );

  const startTask = useCallback(
    (id: string) => {
      return dispatch(startWorkThunk(id)).unwrap();
    },
    [dispatch]
  );

  const pauseTask = useCallback(
    (id: string, reason: string) => {
      return dispatch(pauseWorkThunk({ id, reason })).unwrap();
    },
    [dispatch]
  );

  const resumeTask = useCallback(
    (id: string) => {
      return dispatch(resumeWorkThunk(id)).unwrap();
    },
    [dispatch]
  );

  const completeTask = useCallback(
    (id: string, data: { notes?: string; attachments?: string[] }) => {
      return dispatch(markWorkCompletedThunk({ id, data })).unwrap();
    },
    [dispatch]
  );

  const confirmTaskDone = useCallback(
    (id: string, payload?: any) => {
      return dispatch(confirmCompletionThunk({ id, payload })).unwrap();
    },
    [dispatch]
  );

  const commentOnComplaint = useCallback(
    (id: string, commentText: string) => {
      return dispatch(
        addComplaintCommentThunk({
          id,
          data: { remarks: commentText, comment: commentText },
        })
      ).unwrap();
    },
    [dispatch]
  );

  const submitFeedback = useCallback(
    (id: string, feedbackData: any) => {
      return dispatch(addFeedbackThunk({ id, data: feedbackData })).unwrap();
    },
    [dispatch]
  );

  const getAnalytics = useCallback(
    (params?: any) => {
      return dispatch(fetchDashboardAnalyticsThunk(params));
    },
    [dispatch]
  );

  const updateStatus = useCallback(
    (id: string, data: any) => {
      return dispatch(updateComplaintStatusThunk({ id, data })).unwrap();
    },
    [dispatch]
  );

  const clearErrors = useCallback(() => {
    dispatch(clearComplaintErrorsAction());
  }, [dispatch]);

  return {
    complaints: list || [],
    pagination: pagination || { totalRecords: 0, currentPage: 1, totalPages: 1, limit: 10 },
    currentComplaint,
    dashboardAnalytics,
    status,
    isLoading: status === 'loading',
    isError: status === 'failed',
    error,

    fetchComplaints: getComplaints,
    fetchComplaintDetails: getComplaintDetails,
    createComplaint: raiseComplaint,
    assignTechnician: assignTech,
    acceptAssignment: acceptAssign,
    rejectAssignment: rejectAssign,
    startWork: startTask,
    pauseWork: pauseTask,
    resumeWork: resumeTask,
    markWorkCompleted: completeTask,
    confirmCompletion: confirmTaskDone,
    addComment: commentOnComplaint,
    addFeedback: submitFeedback,
    fetchDashboardAnalytics: getAnalytics,
    updateStatus,
    clearErrors,
  };
};

export default useComplaints;
