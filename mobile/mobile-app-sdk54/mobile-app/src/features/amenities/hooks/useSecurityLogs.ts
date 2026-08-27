import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import {
  fetchSecurityLogsThunk,
  fetchDashboardStatsThunk,
  setFilters,
  setPage,
  clearFilters,
  addLogRealTime,
} from '../store/securityLogSlice';

export function useSecurityLogs() {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  const { logs, dashboard, pagination, filters, loading, error } = useSelector(
    (state: RootState) => state.securityLogs
  );

  const loadData = useCallback(() => {
    const params = {
      ...filters,
      page: pagination.page,
      limit: pagination.limit,
    };

    // Remove empty string fields
    Object.keys(params).forEach((key) => {
      const k = key as keyof typeof params;
      if (params[k] === '' || params[k] === undefined) {
        delete params[k];
      }
    });

    dispatch(fetchSecurityLogsThunk(params));
    dispatch(fetchDashboardStatsThunk());
  }, [dispatch, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;

    const handleLogCreated = (logData: any) => {
      dispatch(addLogRealTime(logData));
    };

    socket.on('SECURITY_LOG_CREATED', handleLogCreated);

    return () => {
      socket.off('SECURITY_LOG_CREATED', handleLogCreated);
    };
  }, [dispatch, socket]);

  const handleFilterChange = (key: string, value: string) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
  };

  return {
    logs,
    dashboard,
    pagination,
    filters,
    loading,
    error,
    loadData,
    handleFilterChange,
    handlePageChange,
    handleClearFilters,
  };
}

export default useSecurityLogs;
