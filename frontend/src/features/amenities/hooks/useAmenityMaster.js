import { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAmenities, addAmenity, editAmenity, changeAmenityStatus, removeAmenity } from '../store/amenitySlice.js';
import { useAuth } from '../../auth/hooks/useAuth.js';

export const useAmenityMaster = () => {
  const dispatch = useDispatch();
  const { checkPermission } = useAuth();
  
  const { items, loading, error } = useSelector(state => state.amenities);

  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('newest');

  // Granular permission checks — each action is individually gated
  const canCreate = checkPermission('amenities:manage_master');
  const canUpdate = checkPermission('amenities:manage_master');
  const canDelete = checkPermission('amenities:manage_master');
  const canManageBookings = checkPermission('amenities:manage_bookings');
  // Legacy alias kept for components that still use canManage
  const canManage = canCreate || canUpdate || canDelete || canManageBookings;

  const loadAmenities = useCallback(() => {
    dispatch(getAmenities());
  }, [dispatch]);

  const createAmenity = async (data) => {
    return await dispatch(addAmenity(data)).unwrap();
  };

  const updateAmenity = async (id, data) => {
    return await dispatch(editAmenity({ id, data })).unwrap();
  };

  const updateAmenityStatus = async (id, status) => {
    return await dispatch(changeAmenityStatus({ id, status })).unwrap();
  };

  const deleteAmenity = async (id) => {
    return await dispatch(removeAmenity(id)).unwrap();
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lowerSearch) || 
        (item.location && item.location.toLowerCase().includes(lowerSearch))
      );
    }

    if (categoryFilter) {
      result = result.filter(item => item.type === categoryFilter);
    }

    if (statusFilter) {
      result = result.filter(item => item.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    result.sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name);
      if (sortField === 'capacity') return b.capacity - a.capacity;
      if (sortField === 'rate') return (b.ratePerHour || 0) - (a.ratePerHour || 0);
      // 'newest' default fallback using _id or createdAt
      return a._id < b._id ? 1 : -1; 
    });

    return result;
  }, [items, search, categoryFilter, statusFilter, sortField]);

  return {
    items: filteredItems,
    rawItemsCount: items.length,
    loading,
    error,
    viewMode,
    setViewMode,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    sortField,
    setSortField,
    // Granular permissions
    canCreate,
    canUpdate,
    canDelete,
    canManageBookings,
    canManage, // backward-compat alias
    loadAmenities,
    createAmenity,
    updateAmenity,
    updateAmenityStatus,
    deleteAmenity
  };
};

export default useAmenityMaster;

