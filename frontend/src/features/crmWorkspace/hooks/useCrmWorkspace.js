import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchInquiries,
  fetchInquiryById,
  createInquiry,
  updateInquiry,
  fetchTasks,
  createTask,
  updateTask,
  fetchMeetings,
  scheduleMeeting,
  fetchThread,
  sendThreadMessage,
  setActiveTab,
  setActiveInquiry,
  clearCrmError,
} from '../store/crmSlice.js';

/**
 * Custom Hook: useCrmWorkspace
 *
 * Controller bridge for the Unified Customer/Deal Workspace UI components.
 * Encapsulates all Redux Toolkit dispatchers and selectors (Thin View Pattern).
 */
export const useCrmWorkspace = () => {
  const dispatch = useDispatch();

  // 1. Selector mappings
  const {
    activeInquiry,
    inquiries,
    tasks,
    meetings,
    activeThread,
    pagination,
    taskPagination,
    activeTab,
    loading,
    taskLoading,
    error,
  } = useSelector((state) => state.crmWorkspace || state.crm || {});

  // 2. Interaction Logic Dispatchers
  const handleTabChange = useCallback(
    (tabName) => {
      dispatch(setActiveTab(tabName));
    },
    [dispatch]
  );

  const selectActiveInquiry = useCallback(
    (inquiry) => {
      dispatch(setActiveInquiry(inquiry));
    },
    [dispatch]
  );

  const fetchInquiriesList = useCallback(
    (params = {}) => {
      return dispatch(fetchInquiries(params));
    },
    [dispatch]
  );

  const fetchInquiryDetails = useCallback(
    (id) => {
      return dispatch(fetchInquiryById(id));
    },
    [dispatch]
  );

  const createInquiryItem = useCallback(
    (payload) => {
      return dispatch(createInquiry(payload));
    },
    [dispatch]
  );

  const updateInquiryItem = useCallback(
    (id, data) => {
      return dispatch(updateInquiry({ id, data }));
    },
    [dispatch]
  );

  const fetchTasksList = useCallback(
    (params = {}) => {
      return dispatch(fetchTasks(params));
    },
    [dispatch]
  );

  const createTaskItem = useCallback(
    (payload) => {
      return dispatch(createTask(payload));
    },
    [dispatch]
  );

  const updateTaskItem = useCallback(
    (id, data) => {
      return dispatch(updateTask({ id, data }));
    },
    [dispatch]
  );

  const fetchMeetingsList = useCallback(
    (params = {}) => {
      return dispatch(fetchMeetings(params));
    },
    [dispatch]
  );

  const scheduleMeetingItem = useCallback(
    (payload) => {
      return dispatch(scheduleMeeting(payload));
    },
    [dispatch]
  );

  const fetchThreadData = useCallback(
    (inquiryId) => {
      return dispatch(fetchThread(inquiryId));
    },
    [dispatch]
  );

  const sendChatMessage = useCallback(
    (inquiryId, messageData) => {
      return dispatch(sendThreadMessage({ inquiryId, messageData }));
    },
    [dispatch]
  );

  const resetError = useCallback(
    () => {
      dispatch(clearCrmError());
    },
    [dispatch]
  );

  return {
    // State
    activeInquiry,
    inquiries,
    tasks,
    meetings,
    activeThread,
    pagination,
    taskPagination,
    activeTab,
    loading,
    taskLoading,
    error,

    // Methods
    handleTabChange,
    selectActiveInquiry,
    fetchInquiriesList,
    fetchInquiryDetails,
    createInquiryItem,
    updateInquiryItem,
    fetchTasksList,
    createTaskItem,
    updateTaskItem,
    fetchMeetingsList,
    scheduleMeetingItem,
    fetchThreadData,
    sendChatMessage,
    resetError,
  };
};

export default useCrmWorkspace;
