import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchNotices,
  fetchNoticeById,
  createNotice as createNoticeThunk,
  updateNotice as updateNoticeThunk,
  deleteNotice as deleteNoticeThunk,
  togglePin as togglePinThunk,
  markAsRead as markAsReadThunk,
  bookmarkNotice as bookmarkNoticeThunk,
  setSearch as setSearchAction,
  setFilters as setFiltersAction,
  setSort as setSortAction,
  resetFilters as resetFiltersAction,
  setCurrentPage as setCurrentPageAction,
  setLimit as setLimitAction,
  selectNotice as selectNoticeAction,
  clearNoticeErrors as clearNoticeErrorsAction,
  clearNoticeSuccess as clearNoticeSuccessAction,
  Notice,
} from '../store/noticeBoardSlice';

export const useNoticeBoard = () => {
  const dispatch = useDispatch<AppDispatch>();

  // State Selectors
  const {
    notices,
    selectedNotice,
    loading,
    error,
    success,
    pagination,
    search,
    filters,
    sort,
  } = useSelector((state: RootState) => (state as any).noticeBoard);

  // Load notices list
  const loadNotices = useCallback(() => {
    return dispatch(fetchNotices());
  }, [dispatch]);

  // Load single notice details
  const loadNotice = useCallback(
    (id: string) => {
      return dispatch(fetchNoticeById(id));
    },
    [dispatch]
  );

  // Create notice
  const createNotice = useCallback(
    (noticeData: any) => {
      return dispatch(createNoticeThunk(noticeData)).unwrap();
    },
    [dispatch]
  );

  // Update notice
  const updateNotice = useCallback(
    (id: string, noticeData: any) => {
      return dispatch(updateNoticeThunk({ id, noticeData })).unwrap();
    },
    [dispatch]
  );

  // Delete notice
  const deleteNotice = useCallback(
    (id: string) => {
      return dispatch(deleteNoticeThunk(id)).unwrap();
    },
    [dispatch]
  );

  // Pin / Unpin notice
  const togglePin = useCallback(
    (id: string, isPinned: boolean) => {
      return dispatch(togglePinThunk({ id, isPinned })).unwrap();
    },
    [dispatch]
  );

  // Mark notice as read
  const handleMarkAsRead = useCallback(
    (id: string) => {
      return dispatch(markAsReadThunk(id)).unwrap();
    },
    [dispatch]
  );

  // Bookmark notice
  const handleBookmarkNotice = useCallback(
    (id: string, isBookmarked: boolean) => {
      return dispatch(bookmarkNoticeThunk({ id, isBookmarked })).unwrap();
    },
    [dispatch]
  );

  // Set Search term
  const setSearch = useCallback(
    (term: string) => {
      dispatch(setSearchAction(term));
      dispatch(fetchNotices());
    },
    [dispatch]
  );

  // Apply filters
  const applyFilters = useCallback(
    (filtersObj: any) => {
      dispatch(setFiltersAction(filtersObj));
      dispatch(fetchNotices());
    },
    [dispatch]
  );

  // Reset filters
  const resetFilters = useCallback(
    (isResident: boolean = false) => {
      dispatch(resetFiltersAction());
      if (isResident) {
        dispatch(setFiltersAction({ status: 'Published' }));
      }
      dispatch(fetchNotices());
    },
    [dispatch]
  );

  // Go to page
  const changePage = useCallback(
    (page: number) => {
      dispatch(setCurrentPageAction(page));
      dispatch(fetchNotices());
    },
    [dispatch]
  );

  // Change limit
  const changeLimit = useCallback(
    (limitVal: number) => {
      dispatch(setLimitAction(limitVal));
      dispatch(fetchNotices());
    },
    [dispatch]
  );

  // Select a notice for temporary UI detail rendering
  const selectNotice = useCallback(
    (notice: Notice | null) => {
      dispatch(selectNoticeAction(notice));
    },
    [dispatch]
  );

  // Clear states
  const clearNoticeErrors = useCallback(() => {
    dispatch(clearNoticeErrorsAction());
  }, [dispatch]);

  const clearNoticeSuccess = useCallback(() => {
    dispatch(clearNoticeSuccessAction());
  }, [dispatch]);

  const initializeResidentBoard = useCallback(() => {
    dispatch(setLimitAction(5));
    dispatch(setFiltersAction({ status: 'Published' }));
    dispatch(fetchNotices());
  }, [dispatch]);

  return {
    // Selectors
    notices,
    selectedNotice,
    loading,
    error,
    success,
    pagination,
    search,
    filters,
    sort,

    // Callbacks
    loadNotices,
    loadNotice,
    createNotice,
    updateNotice,
    deleteNotice,
    togglePin,
    markAsRead: handleMarkAsRead,
    bookmarkNotice: handleBookmarkNotice,
    setSearch,
    applyFilters,
    resetFilters,
    changePage,
    changeLimit,
    selectNotice,
    clearNoticeErrors,
    clearNoticeSuccess,
    initializeResidentBoard,
  };
};

export default useNoticeBoard;
