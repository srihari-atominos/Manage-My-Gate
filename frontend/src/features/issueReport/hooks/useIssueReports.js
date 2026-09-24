import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  loadPlatformReports,
  loadPlatformReportDetails,
  setFilters,
  resetFilters,
  setSelectedReport,
  clearSelectedReport,
  clearError,
} from '../store/issueReportSlice.js'

/**
 * Custom controller hook serving as the bridge between UI components and the Redux engine.
 */
export const useIssueReports = () => {
  const dispatch = useDispatch()

  const reports = useSelector((state) => state.issueReport.list)
  const pagination = useSelector((state) => state.issueReport.pagination)
  const filters = useSelector((state) => state.issueReport.filters)
  const selectedReport = useSelector((state) => state.issueReport.selectedReport)
  const loading = useSelector((state) => state.issueReport.loading)
  const detailsLoading = useSelector((state) => state.issueReport.detailsLoading)
  const error = useSelector((state) => state.issueReport.error)
  const detailsError = useSelector((state) => state.issueReport.detailsError)

  const fetchReports = useCallback(
    (params = {}) => {
      dispatch(loadPlatformReports(params))
    },
    [dispatch],
  )

  const updateFilters = useCallback(
    (newFilters = {}) => {
      dispatch(setFilters(newFilters))
      dispatch(loadPlatformReports({ page: 1, ...newFilters }))
    },
    [dispatch],
  )

  const changePage = useCallback(
    (newPage) => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        dispatch(loadPlatformReports({ page: newPage }))
      }
    },
    [dispatch, pagination.totalPages],
  )

  const changeLimit = useCallback(
    (newLimit) => {
      dispatch(loadPlatformReports({ page: 1, limit: newLimit }))
    },
    [dispatch],
  )

  const resetAllFilters = useCallback(() => {
    dispatch(resetFilters())
    dispatch(
      loadPlatformReports({
        page: 1,
        search: '',
        reportType: '',
        feature: '',
        organisationId: '',
        startDate: '',
        endDate: '',
      }),
    )
  }, [dispatch])

  const openReportDetails = useCallback(
    (id, initialData = null) => {
      if (initialData) {
        dispatch(setSelectedReport(initialData))
      }
      if (id) {
        dispatch(loadPlatformReportDetails(id))
      }
    },
    [dispatch],
  )

  const closeReportDetails = useCallback(() => {
    dispatch(clearSelectedReport())
  }, [dispatch])

  const clearErrors = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  return {
    reports,
    pagination,
    filters,
    selectedReport,
    loading,
    detailsLoading,
    error,
    detailsError,
    fetchReports,
    updateFilters,
    changePage,
    changeLimit,
    resetAllFilters,
    openReportDetails,
    closeReportDetails,
    clearErrors,
  }
}

export default useIssueReports
