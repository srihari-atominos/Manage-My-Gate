import { useState, useEffect, useCallback } from 'react';
import { fetchBookingQueue } from '../services/amenityBookingApi.js';
import toast from 'react-hot-toast';

export const useAdminLedgers = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });


  const fetchBookings = useCallback(async (page = 1, searchQuery = '') => {
    try {
      setLoading(true);
      const res = await fetchBookingQueue({ page, limit: 10, search: searchQuery });
      if (res) {
        setBookings(res.data || []);
        setPagination(res.pagination || { currentPage: 1, totalPages: 1, totalRecords: 0 });
      }
    } catch (err) {
      toast.error('Failed to fetch ledger bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings(1, search);
  }, [fetchBookings, search]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handlePageChange = (newPage) => {
    fetchBookings(newPage, search);
  };

  return {
    bookings,
    loading,
    search,
    pagination,
    handleSearchChange,
    handlePageChange
  };
};

export default useAdminLedgers;
