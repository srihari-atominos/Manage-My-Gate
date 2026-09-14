import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { selectActiveOrgId } from '../../auth/store/authSelectors';
import amenityManagementService from '../services/amenityManagementService';
import {
  AmenityFacility,
  AmenityArchetype,
} from '../types/amenityDomain.types';
import { normalizeFacilityFromApi } from '../utils/amenityPayloadMappers';
import { mapAmenityApiError } from '../utils/amenityErrorMapper';
import { upsertAmenity, removeAmenity } from '../store/amenitySlice';

export type ArchetypeFilterOption = 'All' | AmenityArchetype;
export type AmenityStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface AmenityFilterValues {
  archetypes: AmenityArchetype[];
  categories: string[];
  pricingModel: 'ALL' | 'FREE' | 'PAID';
}

export const useAmenityMaster = (initialArchetype: ArchetypeFilterOption = 'All') => {
  const dispatch = useDispatch<AppDispatch>();

  const activeOrgId = useSelector((state: RootState) =>
    (state as any)?.workspace?.activeOrganizationId ||
    selectActiveOrgId(state)
  );
  const isAuthInitialized = useSelector((state: RootState) => (state as any)?.auth?.isInitialized);

  const [facilities, setFacilities] = useState<AmenityFacility[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<AmenityStatusFilter>('ALL');
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeFilterOption>(initialArchetype);

  // Advanced multi-select filter states
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<AmenityFilterValues>({
    archetypes: [],
    categories: [],
    pricingModel: 'ALL',
  });

  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isArchetypeSheetOpen, setIsArchetypeSheetOpen] = useState<boolean>(false);
  const [creationArchetype, setCreationArchetype] = useState<AmenityArchetype>('SHARED_CAPACITY');
  const [editingAmenity, setEditingAmenity] = useState<AmenityFacility | null>(null);

  const [selectedAmenityDetail, setSelectedAmenityDetail] = useState<AmenityFacility | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AmenityFacility | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AmenityFacility | null>(null);

  const [saving, setSaving] = useState<boolean>(false);

  // Live status counts for filter pills (matching Billing Ledger pattern)
  const statusCounts = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter(
      (f) => (f.status === 'ACTIVE' || (f as any).isActive === true) && f.status !== 'MAINTENANCE'
    ).length;
    const inactive = facilities.filter(
      (f) => (f.status === 'INACTIVE' || (f as any).isActive === false) && f.status !== 'MAINTENANCE'
    ).length;
    const maintenance = facilities.filter((f) => f.status === 'MAINTENANCE').length;
    return { total, active, inactive, maintenance };
  }, [facilities]);

  // Dynamically extract distinct categories from facilities catalog
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => {
      const cat = (f as any).category || (f as any).type;
      if (cat && typeof cat === 'string') {
        set.add(cat);
      }
    });
    if (set.size === 0) {
      ['Sports', 'Fitness', 'Clubhouse', 'Events', 'Leisure', 'Utility'].forEach((c) => set.add(c));
    }
    return Array.from(set);
  }, [facilities]);

  // Active filter badge count for the filter icon in SearchFilterBar
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.archetypes.length > 0) count += activeFilters.archetypes.length;
    if (activeFilters.categories.length > 0) count += activeFilters.categories.length;
    if (activeFilters.pricingModel !== 'ALL') count++;
    return count;
  }, [activeFilters]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await amenityManagementService.getFacilities({
        page: 1,
        limit: 100,
      });

      console.log('[useAmenityMaster] Facilities response received:', res);

      const rawPayload: any = res?.data;
      const rawItems: any[] =
        (Array.isArray(rawPayload) ? rawPayload : null) ||
        (Array.isArray(rawPayload?.data) ? rawPayload.data : null) ||
        (Array.isArray(rawPayload?.items) ? rawPayload.items : null) ||
        (Array.isArray((res as any)?.items) ? (res as any).items : null) ||
        (Array.isArray((res as any)?.data) ? (res as any).data : null) ||
        [];

      const normalizedItems: AmenityFacility[] = rawItems.map(normalizeFacilityFromApi);
      console.log('[useAmenityMaster] Parsed facilities count:', normalizedItems.length);
      setFacilities(normalizedItems);

      // Sync into Redux store for global state synchronization
      normalizedItems.forEach((fac) => {
        dispatch(upsertAmenity(fac));
      });
    } catch (err: any) {
      console.error('[useAmenityMaster] Failed to load facilities:', err);
      const mapped = mapAmenityApiError(err);
      setError(mapped.message || 'Failed to load amenities catalog');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData, activeOrgId, isAuthInitialized]);

  const filteredAmenities = useMemo(() => {
    return facilities.filter((facility) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        facility.name.toLowerCase().includes(query) ||
        (facility.description && facility.description.toLowerCase().includes(query)) ||
        (facility.code && facility.code.toLowerCase().includes(query)) ||
        ((facility as any).location && (facility as any).location.toLowerCase().includes(query)) ||
        (facility.timezone && facility.timezone.toLowerCase().includes(query));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus =
          (facility.status === 'ACTIVE' || (facility as any).isActive === true) &&
          facility.status !== 'MAINTENANCE';
      } else if (statusFilter === 'INACTIVE') {
        matchesStatus =
          (facility.status === 'INACTIVE' || (facility as any).isActive === false) &&
          facility.status !== 'MAINTENANCE';
      } else if (statusFilter === 'MAINTENANCE') {
        matchesStatus = facility.status === 'MAINTENANCE';
      }

      // Archetype filter (multi-select takes priority if selected, fallback to selectedArchetype)
      let matchesArchetype = true;
      if (activeFilters.archetypes.length > 0) {
        matchesArchetype = activeFilters.archetypes.includes(facility.archetype);
      } else if (selectedArchetype !== 'All') {
        matchesArchetype =
          facility.archetype === selectedArchetype ||
          (facility as any).category === selectedArchetype ||
          (facility as any).type === selectedArchetype;
      }

      // Category filter (multi-select)
      let matchesCategory = true;
      if (activeFilters.categories.length > 0) {
        const facCat = (facility as any).category || (facility as any).type;
        matchesCategory = activeFilters.categories.includes(facCat);
      }

      // Pricing model filter
      let matchesPricing = true;
      const pConfig = facility.pricingConfig || (facility as any).pricing;
      const isFree =
        !pConfig ||
        pConfig.type === 'FREE' ||
        (pConfig as any).pricingType === 'FREE' ||
        (pConfig as any).model === 'FREE' ||
        (Number(pConfig.baseRate ?? (pConfig as any).ratePerHour ?? 0) === 0);

      if (activeFilters.pricingModel === 'FREE') {
        matchesPricing = isFree;
      } else if (activeFilters.pricingModel === 'PAID') {
        matchesPricing = !isFree;
      }

      return matchesSearch && matchesStatus && matchesArchetype && matchesCategory && matchesPricing;
    });
  }, [facilities, search, statusFilter, selectedArchetype, activeFilters]);

  const handleApplyFilters = (newFilters: AmenityFilterValues) => {
    setActiveFilters(newFilters);
    setIsFilterDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setActiveFilters({
      archetypes: [],
      categories: [],
      pricingModel: 'ALL',
    });
    setIsFilterDrawerOpen(false);
  };

  const handleOpenCreateModal = () => {
    setEditingAmenity(null);
    if (selectedArchetype !== 'All') {
      setCreationArchetype(selectedArchetype);
    }
    setIsArchetypeSheetOpen(true);
  };

  const handleSelectArchetypeForCreation = (archetype: AmenityArchetype) => {
    setCreationArchetype(archetype);
    setIsArchetypeSheetOpen(false);
    setEditingAmenity(null);
    setIsFormModalOpen(true);
  };

  const handleCloseArchetypeSheet = () => {
    setIsArchetypeSheetOpen(false);
  };

  const handleOpenEditModal = (amenity: AmenityFacility) => {
    setEditingAmenity(amenity);
    if (amenity.archetype) {
      setCreationArchetype(amenity.archetype);
    }
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingAmenity(null);
  };

  const handleFormSubmit = async (payload: any) => {
    setSaving(true);
    try {
      if (editingAmenity) {
        const facilityId = editingAmenity._id || (editingAmenity as any).id;
        await amenityManagementService.updateFacility(facilityId, payload);
        Alert.alert('Success', 'Facility specifications updated successfully');
      } else {
        await amenityManagementService.createFacility(payload);
        Alert.alert('Success', 'Facility created successfully in master catalog');
      }
      handleCloseFormModal();
      await loadData();
    } catch (err: any) {
      console.error('Failed to save amenity facility', err);
      const mapped = mapAmenityApiError(err);
      Alert.alert(
        'Save Failed',
        mapped.message || 'Failed to save amenity facility. Please verify required fields.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (amenity: AmenityFacility) => {
    setDeactivateTarget(amenity);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setSaving(true);
    try {
      const facilityId = deactivateTarget._id || (deactivateTarget as any).id;
      const currentIsActive =
        deactivateTarget.status === 'ACTIVE' || (deactivateTarget as any).isActive === true;
      const nextIsActive = !currentIsActive;

      await amenityManagementService.updateFacilityStatus(facilityId, nextIsActive);
      Alert.alert(
        'Success',
        `Facility ${nextIsActive ? 'activated' : 'deactivated'} successfully`
      );
      setDeactivateTarget(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to change status', err);
      const mapped = mapAmenityApiError(err);
      Alert.alert('Status Update Error', mapped.message || 'Failed to update facility status');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const facilityId = String(deleteTarget._id || (deleteTarget as any).id || '');
    setSaving(true);
    try {
      await amenityManagementService.deleteFacility(facilityId);
      dispatch(removeAmenity(facilityId));
      Alert.alert('Success', 'Facility removed from master catalog');
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete amenity', err);
      const mapped = mapAmenityApiError(err);
      Alert.alert('Delete Error', mapped.message || 'Failed to delete facility record');
    } finally {
      setSaving(false);
    }
  };

  return {
    facilities,
    amenities: facilities,
    filteredAmenities,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    statusCounts,
    availableCategories,
    activeFilters,
    setActiveFilters,
    activeFilterCount,
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
    handleApplyFilters,
    handleResetFilters,
    selectedArchetype,
    setSelectedArchetype,
    selectedCategory: selectedArchetype,
    setSelectedCategory: (cat: any) => setSelectedArchetype(cat),
    loading,
    error,
    isFormModalOpen,
    isArchetypeSheetOpen,
    setIsArchetypeSheetOpen,
    creationArchetype,
    setCreationArchetype,
    editingAmenity,
    selectedAmenityDetail,
    setSelectedAmenityDetail,
    deleteTarget,
    setDeleteTarget,
    deactivateTarget,
    setDeactivateTarget,
    saving,
    loadData,
    handleOpenCreateModal,
    handleSelectArchetypeForCreation,
    handleCloseArchetypeSheet,
    handleOpenEditModal,
    handleCloseFormModal,
    handleFormSubmit,
    handleToggleStatus,
    handleConfirmDeactivate,
    handleConfirmDelete,
  };
};

export default useAmenityMaster;
