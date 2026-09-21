import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { upsertAmenity, removeAmenity, fetchAmenitiesThunk } from '../store/amenitySlice';
import { SECONDARY_CATEGORIES } from '../constants/amenityCatalogPresets';
import { showCrossPlatformAlert } from '../../../utils/alertUtils';

export type ArchetypeFilterOption = 'All' | AmenityArchetype;
export type AmenityStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DRAFT';

export interface AmenityFilterValues {
  archetypes: AmenityArchetype[];
  categories: string[];
  pricingModel: 'ALL' | 'FREE' | 'PAID';
}

export const useAmenityMaster = (initialArchetype: ArchetypeFilterOption = 'All') => {
  const dispatch = useDispatch<AppDispatch>();
  const pagination = useSelector((state: RootState) => state.amenities?.pagination);

  const activeOrgId = useSelector((state: RootState) =>
    (state as any)?.workspace?.activeOrganizationId ||
    selectActiveOrgId(state)
  );
  const isAuthInitialized = useSelector((state: RootState) => (state as any)?.auth?.isInitialized);
  const reduxAmenities = useSelector((state: RootState) => (state as any)?.amenities?.amenities);

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
  const [deactivationConflict, setDeactivationConflict] = useState<{
    facility: AmenityFacility;
    count: number;
    message?: string;
  } | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);

  // Live status counts for filter pills (matching Billing Ledger pattern)
  const statusCounts = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter((f) => {
      const s = String(f.status || '').toUpperCase();
      const isDraft = f.isDraft === true || s === 'DRAFT';
      const isActive = (f as any).isActive === true || s === 'ACTIVE';
      return isActive && s !== 'MAINTENANCE' && !isDraft;
    }).length;
    const inactive = facilities.filter((f) => {
      const s = String(f.status || '').toUpperCase();
      const isDraft = f.isDraft === true || s === 'DRAFT';
      const isInactive = (f as any).isActive === false || s === 'INACTIVE';
      return isInactive && s !== 'MAINTENANCE' && !isDraft;
    }).length;
    const maintenance = facilities.filter((f) => String(f.status || '').toUpperCase() === 'MAINTENANCE').length;
    const draft = facilities.filter((f) => f.isDraft === true || String(f.status || '').toUpperCase() === 'DRAFT').length;
    return { total, active, inactive, maintenance, draft };
  }, [facilities]);

  // Extract distinct categories from catalog merged with standard creation presets
  const availableCategories = useMemo(() => {
    const list: string[] = SECONDARY_CATEGORIES.map((c) => c.value);
    const known = new Set(list.map((v) => v.toLowerCase()));

    facilities.forEach((f) => {
      const cat = (f as any).category || (f as any).type;
      if (cat && typeof cat === 'string') {
        const clean = cat.trim();
        if (clean && !known.has(clean.toLowerCase())) {
          list.push(clean);
          known.add(clean.toLowerCase());
        }
      }
    });

    return list;
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

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.currentPage < pagination.totalPages) {
      dispatch(fetchAmenitiesThunk({ page: pagination.currentPage + 1 } as any));
    }
  }, [dispatch, pagination]);

  useEffect(() => {
    loadData();
  }, [loadData, activeOrgId, isAuthInitialized]);

  // Synchronize new socket-delivered or newly added facilities from Redux store
  useEffect(() => {
    if (Array.isArray(reduxAmenities) && reduxAmenities.length > 0) {
      setFacilities((prev) => {
        const prevMap = new Map(prev.map((p) => [String(p._id), p]));
        let hasChanges = false;
        const merged = [...prev];
        reduxAmenities.forEach((ra: any) => {
          const id = String(ra._id || ra.id || '');
          if (id && !prevMap.has(id)) {
            hasChanges = true;
            merged.unshift(normalizeFacilityFromApi(ra));
          }
        });
        return hasChanges ? merged : prev;
      });
    }
  }, [reduxAmenities]);

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
      const facStatusUpper = String(facility.status || '').toUpperCase();
      const facIsActive = (facility as any).isActive === true || facStatusUpper === 'ACTIVE';
      const facIsDraft = facility.isDraft === true || facStatusUpper === 'DRAFT';

      if (statusFilter === 'ACTIVE') {
        matchesStatus = facIsActive && facStatusUpper !== 'MAINTENANCE' && !facIsDraft;
      } else if (statusFilter === 'INACTIVE') {
        matchesStatus = !facIsActive && facStatusUpper !== 'MAINTENANCE' && !facIsDraft;
      } else if (statusFilter === 'MAINTENANCE') {
        matchesStatus = facStatusUpper === 'MAINTENANCE';
      } else if (statusFilter === 'DRAFT') {
        matchesStatus = facIsDraft;
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
        const facCat = String((facility as any).category || (facility as any).type || '').trim().toLowerCase();
        matchesCategory = activeFilters.categories.some((selCat) => {
          const cleanSel = selCat.trim().toLowerCase();
          if (facCat === cleanSel) return true;
          // Match by label or value in SECONDARY_CATEGORIES
          const meta = SECONDARY_CATEGORIES.find(
            (c) => c.value.toLowerCase() === cleanSel || c.label.toLowerCase() === cleanSel
          );
          if (meta) {
            return (
              facCat === meta.value.toLowerCase() ||
              facCat === meta.label.toLowerCase()
            );
          }
          // Match legacy aliases
          if (cleanSel === 'event space' && (facCat === 'events' || facCat === 'event & banquets')) return true;
          if (cleanSel === 'wellness' && (facCat === 'leisure' || facCat === 'wellness & leisure')) return true;
          if (cleanSel === 'general' && (facCat === 'utility' || facCat === 'general facilities')) return true;
          if (cleanSel === 'pool & spa' && (facCat === 'aquatics' || facCat === 'pool & aquatic' || facCat === 'swimming')) return true;
          return false;
        });
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

  const handleOpenEditModal = async (amenity: AmenityFacility) => {
    // If it's a ROOM_RESOURCE, we must fetch its sub-rooms so the UI doesn't overwrite them with defaults
    let fullAmenity = { ...amenity };
    if (amenity.archetype === 'ROOM_RESOURCE') {
      try {
        const facilityId = amenity._id || (amenity as any).id;
        const res = await amenityManagementService.getResources({ facilityId: String(facilityId), limit: 100 });
        const rawItems = res?.data?.data || res?.data || (res as any)?.items || [];
        
        // Map to the format expected by RoomResourceConfigStep: { id, name, capacity }
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          (fullAmenity as any).subRooms = rawItems.map((r: any) => ({
            id: r._id || r.id || r.identifier,
            name: r.name,
            capacity: r.totalBulkStock || 1,
            isActive: r.isActive,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch sub-rooms for editing:', err);
      }
    }

    setEditingAmenity(fullAmenity);
    if (fullAmenity.archetype) {
      setCreationArchetype(fullAmenity.archetype);
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
        const updateRes: any = await amenityManagementService.updateFacility(facilityId, payload);
        const rawUpdated = updateRes?.data?.data || updateRes?.data || updateRes;
        const normalized = normalizeFacilityFromApi(rawUpdated);
        if (normalized && (normalized._id || (normalized as any).id)) {
          setFacilities((prev) =>
            prev.map((f) => (f._id === normalized._id ? normalized : f))
          );
          dispatch(upsertAmenity(normalized));
        }
      } else {
        const createRes: any = await amenityManagementService.createFacility(payload);
        const rawCreated = createRes?.data?.data || createRes?.data || createRes;
        const normalized = normalizeFacilityFromApi(rawCreated);
        if (normalized && (normalized._id || (normalized as any).id)) {
          setFacilities((prev) => [
            normalized,
            ...prev.filter((f) => f._id !== normalized._id),
          ]);
          dispatch(upsertAmenity(normalized));
        }
        // Auto-clear active search & filters so the newly published facility is immediately visible
        setSearch('');
        setStatusFilter('ALL');
        setSelectedArchetype('All');
        setActiveFilters({ archetypes: [], categories: [], pricingModel: 'ALL' });
      }
      handleCloseFormModal();
      await loadData();
    } catch (err: any) {
      console.error('Failed to save amenity facility', err);
      // Re-throw so the calling wizard (AmenityCreationWizard) can display the error alert
      // and set publishError on its review step. Do NOT call showCrossPlatformAlert here
      // to prevent duplicate alerts.
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (payload: any) => {
    setSavingDraft(true);
    try {
      if (editingAmenity) {
        const facilityId = editingAmenity._id || (editingAmenity as any).id;
        const updateRes: any = await amenityManagementService.updateFacility(facilityId, {
          ...payload,
          isDraft: true,
          status: 'DRAFT',
          isActive: false,
        });
        const rawUpdated = updateRes?.data?.data || updateRes?.data || updateRes;
        const normalized = normalizeFacilityFromApi(rawUpdated);
        if (normalized && (normalized._id || (normalized as any).id)) {
          setFacilities((prev) =>
            prev.map((f) => (f._id === normalized._id ? normalized : f))
          );
          dispatch(upsertAmenity(normalized));
        }
      } else {
        const createRes: any = await amenityManagementService.createFacility({
          ...payload,
          isDraft: true,
          status: 'DRAFT',
          isActive: false,
        });
        const rawCreated = createRes?.data?.data || createRes?.data || createRes;
        const normalized = normalizeFacilityFromApi(rawCreated);
        if (normalized && (normalized._id || (normalized as any).id)) {
          setFacilities((prev) => [
            normalized,
            ...prev.filter((f) => f._id !== normalized._id),
          ]);
          dispatch(upsertAmenity(normalized));
        }
        setSearch('');
        setStatusFilter('ALL');
        setSelectedArchetype('All');
        setActiveFilters({ archetypes: [], categories: [], pricingModel: 'ALL' });
      }
      handleCloseFormModal();
      await loadData();
    } catch (err: any) {
      console.error('Failed to save amenity draft', err);
      // Re-throw so the wizard displays the error alert via its own handler
      throw err;
    } finally {
      setSavingDraft(false);
    }
  };

  const handleToggleStatus = (amenity: AmenityFacility) => {
    setDeactivateTarget(amenity);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const target = deactivateTarget;
    const facilityId = target._id || (target as any).id;
    const currentIsActive =
      target.status === 'ACTIVE' || (target as any).isActive === true;
    const nextIsActive = !currentIsActive;

    // Immediately dismiss initial confirmation dialog so it never gets stuck
    setDeactivateTarget(null);
    setSaving(true);

    try {
      await amenityManagementService.updateFacilityStatus(facilityId, nextIsActive);
      await loadData();
    } catch (err: any) {
      console.error('Failed to change status', err);
      const mapped = mapAmenityApiError(err);

      // Policy T1: Interactive Conflict Resolution Dialog for Upcoming Bookings
      if (mapped.requiresBookingAction) {
        setDeactivationConflict({
          facility: target,
          count: mapped.upcomingBookingsCount || 1,
          message: mapped.message,
        });
        return;
      }

      showCrossPlatformAlert('Status Update Error', mapped.message || 'Failed to update facility status');
    } finally {
      setSaving(false);
    }
  };

  const handleResolveDeactivationConflict = async (
    bookingAction: 'HONOR_EXISTING' | 'CANCEL_AND_REFUND'
  ) => {
    if (!deactivationConflict?.facility) return;
    const target = deactivationConflict.facility;
    const facilityId = target._id || (target as any).id;

    setSaving(true);
    try {
      await amenityManagementService.updateFacilityStatus(facilityId, false, bookingAction);
      const msg =
        bookingAction === 'HONOR_EXISTING'
          ? `Facility "${target.name}" deactivated. Existing confirmed bookings will be honored.`
          : `Facility "${target.name}" deactivated. Existing bookings cancelled with full refunds.`;
      setDeactivationConflict(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to resolve deactivation conflict', err);
      const mapped = mapAmenityApiError(err);
      showCrossPlatformAlert('Resolution Failed', mapped.message || 'Failed to update facility with chosen action');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDeactivationConflict = () => {
    setDeactivationConflict(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const facilityId = String(deleteTarget._id || (deleteTarget as any).id || '');
    setDeleteTarget(null);
    setSaving(true);
    try {
      await amenityManagementService.deleteFacility(facilityId);
      dispatch(removeAmenity(facilityId));
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete amenity', err);
      const mapped = mapAmenityApiError(err);
      
      // If it's a 404, it was likely already deleted (e.g. via double tap or stuck state)
      // We should silently ignore it AND visually remove it from the list
      if (mapped.statusCode === 404 || err?.response?.status === 404 || err?.status === 404 || (mapped.message && mapped.message.toLowerCase().includes('not found'))) {
        dispatch(removeAmenity(facilityId));
        setFacilities((prev) => prev.filter(f => f._id !== facilityId && (f as any).id !== facilityId));
        return;
      }
      
      showCrossPlatformAlert('Delete Error', mapped.message || 'Failed to delete facility record');
    } finally {
      setSaving(false);
    }
  };

  return {
    facilities,
    amenities: facilities,
    filteredAmenities,
    pagination,
    handleLoadMore,
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
    deactivationConflict,
    handleResolveDeactivationConflict,
    handleCloseDeactivationConflict,
    saving,
    savingDraft,
    loadData,
    handleOpenCreateModal,
    handleSelectArchetypeForCreation,
    handleCloseArchetypeSheet,
    handleOpenEditModal,
    handleCloseFormModal,
    handleFormSubmit,
    handleSaveDraft,
    handleToggleStatus,
    handleConfirmDeactivate,
    handleConfirmDelete,
  };
};

export default useAmenityMaster;
