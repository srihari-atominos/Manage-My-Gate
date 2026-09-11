import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store/store';
import amenityManagementService from '../services/amenityManagementService';
import {
  AmenityFacility,
  AmenityArchetype,
} from '../types/amenityDomain.types';
import { normalizeFacilityFromApi } from '../utils/amenityPayloadMappers';
import { mapAmenityApiError } from '../utils/amenityErrorMapper';
import { upsertAmenity, removeAmenity } from '../store/amenitySlice';

export type ArchetypeFilterOption = 'All' | AmenityArchetype;

export const useAmenityMaster = (initialArchetype: ArchetypeFilterOption = 'All') => {
  const dispatch = useDispatch<AppDispatch>();

  const [facilities, setFacilities] = useState<AmenityFacility[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeFilterOption>(initialArchetype);

  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isArchetypeSheetOpen, setIsArchetypeSheetOpen] = useState<boolean>(false);
  const [creationArchetype, setCreationArchetype] = useState<AmenityArchetype>('SHARED_CAPACITY');
  const [editingAmenity, setEditingAmenity] = useState<AmenityFacility | null>(null);

  const [selectedAmenityDetail, setSelectedAmenityDetail] = useState<AmenityFacility | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AmenityFacility | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AmenityFacility | null>(null);

  const [saving, setSaving] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await amenityManagementService.getFacilities({
        page: 1,
        limit: 100,
      });

      const rawItems =
        res?.data?.items ||
        (res as any)?.items ||
        (Array.isArray(res?.data) ? res.data : []);

      const normalizedItems: AmenityFacility[] = rawItems.map(normalizeFacilityFromApi);
      setFacilities(normalizedItems);

      // Sync into Redux store for global state synchronization
      normalizedItems.forEach((fac) => {
        dispatch(upsertAmenity(fac));
      });
    } catch (err: any) {
      console.error('Failed to load facilities', err);
      const mapped = mapAmenityApiError(err);
      setError(mapped.message || 'Failed to load amenities catalog');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAmenities = useMemo(() => {
    return facilities.filter((facility) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        facility.name.toLowerCase().includes(query) ||
        (facility.description && facility.description.toLowerCase().includes(query)) ||
        (facility.timezone && facility.timezone.toLowerCase().includes(query));

      const matchesArchetype =
        selectedArchetype === 'All' ||
        facility.archetype === selectedArchetype ||
        (facility as any).category === selectedArchetype ||
        (facility as any).type === selectedArchetype;

      return matchesSearch && matchesArchetype;
    });
  }, [facilities, search, selectedArchetype]);

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
