import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAmenitiesThunk,
  setSelectedCategory,
  setSearchQuery,
  clearAmenityError,
  Amenity,
} from '../store/amenitySlice';

export function useResidentDiscover() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const [selectedAmenityPreview, setSelectedAmenityPreview] = useState<Amenity | null>(null);

  const { amenities, selectedCategory, searchQuery, pagination, loading, error } = useSelector(
    (state: RootState) => state.amenities
  );

  const categories = [
    'All',
    'Event Space',
    'Sports',
    'Fitness',
    'Wellness',
    'Workspace',
    'Clubhouse',
    'Pool & Spa',
  ];

  const loadCatalog = useCallback(
    (page = 1) => {
      dispatch(
        fetchAmenitiesThunk({
          page,
          limit: 20,
          search: searchQuery,
          category: selectedCategory,
        })
      );
    },
    [dispatch, searchQuery, selectedCategory]
  );

  useEffect(() => {
    loadCatalog(1);
  }, [loadCatalog]);

  const filteredAmenities = useMemo(() => {
    return amenities.filter((item) => {
      const cat = (item.category || item.type || '').toLowerCase().trim();
      const selCat = (selectedCategory || 'All').toLowerCase().trim();

      const matchesCategory =
        selCat === 'all' ||
        cat === selCat ||
        cat.includes(selCat) ||
        selCat.includes(cat);

      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [amenities, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    let activeCount = 0;
    let maintenanceCount = 0;

    filteredAmenities.forEach((a) => {
      const st = (a.status || '').toLowerCase();
      const currentSt = (a.currentStatus || '').toLowerCase();
      if (st === 'active' || currentSt === 'available') {
        activeCount++;
      } else if (st === 'maintenance' || currentSt === 'under maintenance') {
        maintenanceCount++;
      }
    });

    return {
      totalCount: filteredAmenities.length,
      activeCount,
      maintenanceCount,
    };
  }, [filteredAmenities]);

  const activePagination = useMemo(() => {
    return {
      currentPage: pagination?.currentPage || 1,
      totalPages: Math.max(1, Math.ceil(filteredAmenities.length / (pagination?.limit || 20))),
      totalRecords: filteredAmenities.length,
      limit: pagination?.limit || 20,
    };
  }, [pagination, filteredAmenities.length]);

  const handleCategorySelect = (category: string) => {
    dispatch(setSelectedCategory(category));
  };

  const handleSearchChange = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const handleRefresh = () => {
    loadCatalog(1);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.currentPage < pagination.totalPages) {
      loadCatalog(pagination.currentPage + 1);
    }
  };

  const handleRetry = () => {
    dispatch(clearAmenityError());
    loadCatalog(1);
  };

  const navigateToBooking = (amenityId: string) => {
    router.push({
      pathname: '/(resident)/amenities/booking/[id]' as any,
      params: { id: amenityId },
    });
  };

  return {
    amenities: filteredAmenities,
    categories,
    selectedCategory,
    searchQuery,
    pagination: activePagination,
    stats,
    selectedAmenityPreview,
    setSelectedAmenityPreview,
    loading,
    error,
    handleCategorySelect,
    handleSearchChange,
    handleRefresh,
    handleLoadMore,
    handleRetry,
    navigateToBooking,
  };
}

export default useResidentDiscover;
