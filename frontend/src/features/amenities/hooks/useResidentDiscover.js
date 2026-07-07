import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAmenities } from '../store/amenitySlice.js';
import { useNavigate } from 'react-router-dom';

export const useResidentDiscover = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { items, loading, error } = useSelector(state => state.amenities);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = useCallback(() => {
    const params = { status: 'active' };
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    dispatch(getAmenities(params));
  }, [dispatch, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateToBooking = (id) => {
    navigate(`/resident/amenities/calendar`, { state: { amenityId: id } });
  };

  return {
    items: items || [],
    loading,
    error,
    search,
    setSearch,
    navigateToBooking
  };
};

export default useResidentDiscover;
