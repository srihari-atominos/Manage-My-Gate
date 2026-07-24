import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchNotices,
  fetchNoticeById,
  createNotice as createNoticeThunk,
  updateNotice as updateNoticeThunk,
  deleteNotice as deleteNoticeThunk,
  togglePin as togglePinThunk,
  fetchNoticeStats,
  markAsRead,
  bookmarkNotice,
} from '../store/noticeBoardThunk.js'
import {
  setSearch as setSearchAction,
  setFilters as setFiltersAction,
  resetFilters as resetFiltersAction,
  setCurrentPage as setCurrentPageAction,
  setLimit as setLimitAction,
  selectNotice as selectNoticeAction,
  clearNoticeErrors as clearNoticeErrorsAction,
  clearNoticeSuccess as clearNoticeSuccessAction,
} from '../store/noticeBoardSlice.js'

/**
 * useNoticeBoard Custom Controller Hook
 * Exposes Redux selectors and action dispatch handles for Notice Board views and components.
 */
export const useNoticeBoard = () => {
  const dispatch = useDispatch()

  // State Selectors
  const notices = useSelector((state) => state.noticeBoard.notices)
  const selectedNotice = useSelector((state) => state.noticeBoard.selectedNotice)
  const loading = useSelector((state) => state.noticeBoard.loading)
  const error = useSelector((state) => state.noticeBoard.error)
  const success = useSelector((state) => state.noticeBoard.success)
  const pagination = useSelector((state) => state.noticeBoard.pagination)
  const search = useSelector((state) => state.noticeBoard.search)
  const filters = useSelector((state) => state.noticeBoard.filters)
  const sort = useSelector((state) => state.noticeBoard.sort)
  const totalRecords = useSelector((state) => state.noticeBoard.totalRecords)
  const totalPages = useSelector((state) => state.noticeBoard.totalPages)
  const currentPage = useSelector((state) => state.noticeBoard.currentPage)
  const dashboardStats = useSelector((state) => state.noticeBoard.dashboardStats)
  const dashboardLoading = useSelector((state) => state.noticeBoard.dashboardLoading)
  const dashboardError = useSelector((state) => state.noticeBoard.dashboardError)

  // Load notices list
  const loadNotices = useCallback(() => {
    return dispatch(fetchNotices())
  }, [dispatch])

  // Load a single notice details
  const loadNotice = useCallback(
    (id) => {
      return dispatch(fetchNoticeById(id))
    },
    [dispatch],
  )

  // Create notice
  const createNotice = useCallback(
    (noticeData) => {
      return dispatch(createNoticeThunk(noticeData)).unwrap()
    },
    [dispatch],
  )

  // Update notice
  const updateNotice = useCallback(
    (id, noticeData) => {
      return dispatch(updateNoticeThunk({ id, noticeData })).unwrap()
    },
    [dispatch],
  )

  // Delete notice
  const deleteNotice = useCallback(
    (id) => {
      return dispatch(deleteNoticeThunk(id)).unwrap()
    },
    [dispatch],
  )

  // Pin / Unpin notice
  const togglePin = useCallback(
    (id, isPinned) => {
      return dispatch(togglePinThunk({ id, isPinned })).unwrap()
    },
    [dispatch],
  )

  // Mark notice as read
  const handleMarkAsRead = useCallback(
    (id) => {
      return dispatch(markAsRead(id)).unwrap()
    },
    [dispatch],
  )

  // Bookmark notice
  const handleBookmarkNotice = useCallback(
    (id, isBookmarked) => {
      return dispatch(bookmarkNotice({ id, isBookmarked })).unwrap()
    },
    [dispatch],
  )

  // Set Search term
  const setSearch = useCallback(
    (term) => {
      dispatch(setSearchAction(term))
      dispatch(fetchNotices())
    },
    [dispatch],
  )

  // Apply filters
  const applyFilters = useCallback(
    (filtersObj) => {
      dispatch(setFiltersAction(filtersObj))
      dispatch(fetchNotices())
    },
    [dispatch],
  )

  // Reset filters
  const resetFilters = useCallback(
    (isResident = false) => {
      dispatch(resetFiltersAction())
      if (isResident) {
        dispatch(setFiltersAction({ status: 'Published' }))
      }
      dispatch(fetchNotices())
    },
    [dispatch],
  )

  // Go to page
  const changePage = useCallback(
    (page) => {
      dispatch(setCurrentPageAction(page))
      dispatch(fetchNotices())
    },
    [dispatch],
  )

  // Change limit
  const changeLimit = useCallback(
    (limitVal) => {
      dispatch(setLimitAction(limitVal))
      dispatch(fetchNotices())
    },
    [dispatch],
  )

  // Select a notice for temporary UI detail rendering
  const selectNotice = useCallback(
    (notice) => {
      dispatch(selectNoticeAction(notice))
    },
    [dispatch],
  )

  // Clear states
  const clearNoticeErrors = useCallback(() => {
    dispatch(clearNoticeErrorsAction())
  }, [dispatch])

  const clearNoticeSuccess = useCallback(() => {
    dispatch(clearNoticeSuccessAction())
  }, [dispatch])

  const loadNoticeStats = useCallback(() => {
    return dispatch(fetchNoticeStats())
  }, [dispatch])

  const initializeResidentBoard = useCallback(() => {
    dispatch(setLimitAction(4))
    dispatch(setFiltersAction({ status: 'Published' }))
    dispatch(fetchNotices())
  }, [dispatch])

  const initializeAdminBoard = useCallback(() => {
    dispatch(setLimitAction(5))
    dispatch(fetchNotices())
  }, [dispatch])

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
    totalRecords,
    totalPages,
    currentPage,
    dashboardStats,
    dashboardLoading,
    dashboardError,

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
    loadNoticeStats,
    initializeResidentBoard,
    initializeAdminBoard,
  }
}

export default useNoticeBoard
