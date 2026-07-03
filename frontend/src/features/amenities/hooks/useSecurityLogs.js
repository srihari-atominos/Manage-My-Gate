import { useState, useCallback, useEffect } from 'react';
import { fetchBookingQueue } from '../services/amenityBookingApi.js';
import toast from 'react-hot-toast';

export const useSecurityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters state
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    amenityId: '',
    userId: '',
    checkedInBy: ''
  });

  const loadLogs = useCallback(async (page = 1, currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      // Cleanup empty filters
      const activeFilters = Object.entries(currentFilters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {});

      const response = await fetchBookingQueue({ page, limit: pagination.limit, ...activeFilters });
      
      setLogs(response.data?.data || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 10 });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load security logs');
      toast.error('Failed to load security logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, filters]);

  // Initial load
  useEffect(() => {
    loadLogs(1, filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadLogs(newPage, filters);
    }
  }, [pagination.totalPages, filters, loadLogs]);

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    loadLogs(1, newFilters);
  }, [filters, loadLogs]);

  const clearFilters = useCallback(() => {
    const emptyFilters = { status: '', date: '', amenityId: '', userId: '', checkedInBy: '' };
    setFilters(emptyFilters);
    loadLogs(1, emptyFilters);
  }, [loadLogs]);

  return {
    logs,
    pagination,
    loading,
    error,
    filters,
    handlePageChange,
    handleFilterChange,
    clearFilters,
    refresh: () => loadLogs(pagination.currentPage, filters)
  };
};

export default useSecurityLogs;
