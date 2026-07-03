import { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAmenities } from '../store/amenitySlice.js';
import { useNavigate } from 'react-router-dom';

export const useResidentDiscover = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { items, loading, error } = useSelector(state => state.amenities);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadAmenities = useCallback(() => {
    dispatch(getAmenities());
  }, [dispatch]);

  const categories = useMemo(() => {
    const activeItems = items.filter(i => i.status?.toLowerCase() === 'active');
    const cats = new Set(activeItems.map(i => i.type));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter(i => i.status?.toLowerCase() === 'active');

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
  }, [items, search, selectedCategory]);

  const navigateToBooking = (id) => {
    navigate(`/resident/amenities/book/${id}`);
  };

  return {
    items: filteredItems,
    categories,
    loading,
    error,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    loadAmenities,
    navigateToBooking
  };
};

export default useResidentDiscover;
