import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/src/store/store';
import {
  loadCommunityReports,
  loadCommunityReportDetails,
  setFilters,
  resetFilters,
  setSelectedReport,
  clearSelectedReport,
  clearErrors as clearSliceErrors,
} from '../store/issueReportSlice';
import { IssueReportItem, FetchCommunityReportsParams } from '../types/issueReport.types';

export function useCommunityIssueReports() {
  const dispatch = useDispatch<AppDispatch>();

  const reports = useSelector((state: RootState) => state.issueReport?.list || []);
  const pagination = useSelector(
    (state: RootState) =>
      state.issueReport?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
  );
  const filters = useSelector(
    (state: RootState) => state.issueReport?.filters || { search: '', reportType: '', feature: '' }
  );
  const selectedReport = useSelector(
    (state: RootState) => state.issueReport?.selectedReport || null
  );
  const loading = useSelector((state: RootState) => Boolean(state.issueReport?.loading));
  const detailsLoading = useSelector((state: RootState) => Boolean(state.issueReport?.detailsLoading));
  const error = useSelector((state: RootState) => state.issueReport?.error || null);
  const detailsError = useSelector((state: RootState) => state.issueReport?.detailsError || null);

  const fetchReports = useCallback(
    (params: FetchCommunityReportsParams = {}) => {
      dispatch(loadCommunityReports(params));
    },
    [dispatch]
  );

  const updateFilters = useCallback(
    (newFilters: Partial<typeof filters>) => {
      dispatch(setFilters(newFilters));
      dispatch(loadCommunityReports({ page: 1, ...newFilters }));
    },
    [dispatch]
  );

  const changePage = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        dispatch(loadCommunityReports({ page: newPage }));
      }
    },
    [dispatch, pagination.totalPages]
  );

  const resetAllFilters = useCallback(() => {
    dispatch(resetFilters());
    dispatch(loadCommunityReports({ page: 1, search: '', reportType: '', feature: '' }));
  }, [dispatch]);

  const openReportDetails = useCallback(
    (id: string, initialData: IssueReportItem | null = null) => {
      if (initialData) {
        dispatch(setSelectedReport(initialData));
      }
      if (id) {
        dispatch(loadCommunityReportDetails(id));
      }
    },
    [dispatch]
  );

  const closeReportDetails = useCallback(() => {
    dispatch(clearSelectedReport());
  }, [dispatch]);

  const clearErrors = useCallback(() => {
    dispatch(clearSliceErrors());
  }, [dispatch]);

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
    resetAllFilters,
    openReportDetails,
    closeReportDetails,
    clearErrors,
  };
}

export default useCommunityIssueReports;
