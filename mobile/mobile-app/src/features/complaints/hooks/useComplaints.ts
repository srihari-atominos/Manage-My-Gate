import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchComplaints as fetchComplaintsThunk,
  fetchComplaintDetails as fetchComplaintDetailsThunk,
  createComplaint as createComplaintThunk,
  addComplaintComment as addComplaintCommentThunk,
  addFeedback as addFeedbackThunk,
  clearComplaintErrors as clearComplaintErrorsAction,
} from '../store/complaintSlice';

export const useComplaints = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { list, pagination, currentComplaint, status, error } = useSelector(
    (state: RootState) => (state as any).complaints
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

  const commentOnComplaint = useCallback(
    (id: string, commentText: string) => {
      return dispatch(addComplaintCommentThunk({ id, data: { comment: commentText } })).unwrap();
    },
    [dispatch]
  );

  const submitFeedback = useCallback(
    (id: string, feedbackData: any) => {
      return dispatch(addFeedbackThunk({ id, data: feedbackData })).unwrap();
    },
    [dispatch]
  );

  const clearErrors = useCallback(() => {
    dispatch(clearComplaintErrorsAction());
  }, [dispatch]);

  return {
    complaints: list,
    pagination,
    currentComplaint,
    status,
    error,

    fetchComplaints: getComplaints,
    fetchComplaintDetails: getComplaintDetails,
    createComplaint: raiseComplaint,
    addComment: commentOnComplaint,
    addFeedback: submitFeedback,
    clearErrors,
  };
};

export default useComplaints;
