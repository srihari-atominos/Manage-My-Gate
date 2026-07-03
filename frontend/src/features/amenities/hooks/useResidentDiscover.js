import { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAmenities } from '../store/amenitySlice.js';
import { useNavigate } from 'react-router-dom';
import amenityApi from '../services/amenityApi.js';

export const useResidentDiscover = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { items, loading: reduxLoading, error: reduxError } = useSelector(state => state.amenities);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [filterDate, setFilterDate] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');
  
  const [availableItems, setAvailableItems] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const loadAmenities = useCallback(() => {
    dispatch(getAmenities());
  }, [dispatch]);
  
  const searchAvailableSlots = useCallback(async () => {
    if (!filterDate || !filterStartTime || !filterEndTime) {
      setAvailableItems(null);
      return;
    }
    setLocalLoading(true);
    setLocalError(null);
    try {
      const response = await amenityApi.fetchAvailableAmenities(filterDate, filterStartTime, filterEndTime);
      setAvailableItems(response.data);
    } catch (err) {
      setLocalError(err.message || 'Failed to search available slots');
    } finally {
      setLocalLoading(false);
    }
  }, [filterDate, filterStartTime, filterEndTime]);

  const clearFilters = useCallback(() => {
    setFilterDate('');
    setFilterStartTime('');
    setFilterEndTime('');
    setAvailableItems(null);
  }, []);

  const categories = useMemo(() => {
    const sourceItems = availableItems || items;
    const activeItems = sourceItems.filter(i => i.status?.toLowerCase() === 'active');
    const cats = new Set(activeItems.map(i => i.type));
    return ['All', ...Array.from(cats)];
  }, [items, availableItems]);

  const filteredItems = useMemo(() => {
    const sourceItems = availableItems || items;
    let result = sourceItems.filter(i => i.status?.toLowerCase() === 'active');

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lowerSearch) || 
        (item.location && item.location.toLowerCase().includes(lowerSearch))
      );
    }

    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter(item => item.type === selectedCategory);
    }

    return result;
  }, [items, availableItems, search, selectedCategory]);

  const navigateToBooking = (id) => {
    navigate(`/resident/amenities/book/${id}`);
  };

  return {
    items: filteredItems,
    categories,
    loading: reduxLoading || localLoading,
    error: reduxError || localError,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    filterDate,
    setFilterDate,
    filterStartTime,
    setFilterStartTime,
    filterEndTime,
    setFilterEndTime,
    searchAvailableSlots,
    clearFilters,
    loadAmenities,
    navigateToBooking
  };
};

export default useResidentDiscover;
