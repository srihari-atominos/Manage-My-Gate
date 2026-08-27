import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAmenitiesThunk,
  createAmenityThunk,
  updateAmenityThunk,
  deleteAmenityThunk,
  updateAmenityStatusThunk,
  Amenity,
} from '../store/amenitySlice';
import { AmenityFormData } from '../components/AmenityFormModal';

export function useAmenityMaster() {
  const dispatch = useDispatch<AppDispatch>();

  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [selectedAmenityDetail, setSelectedAmenityDetail] = useState<Amenity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Amenity | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const { amenities, loading, error } = useSelector((state: RootState) => state.amenities);

  const loadData = useCallback(() => {
    dispatch(fetchAmenitiesThunk({ search, category: selectedCategory }));
  }, [dispatch, search, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAmenities = useMemo(() => {
    if (!amenities) return [];

    return amenities.filter((item) => {
      // Category filter
      if (selectedCategory && selectedCategory !== 'All') {
        const itemCategory = item.category || item.type || 'General';
        if (itemCategory.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }
      // Search text filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchLocation = (item.location || '').toLowerCase().includes(q);
        const matchCategory = (item.category || item.type || '').toLowerCase().includes(q);
        if (!matchName && !matchLocation && !matchCategory) return false;
      }
      return true;
    });
  }, [amenities, selectedCategory, search]);

  const handleOpenCreateModal = () => {
    setEditingAmenity(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (amenity: Amenity) => {
    setEditingAmenity(amenity);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingAmenity(null);
  };

  const handleFormSubmit = async (formData: AmenityFormData) => {
    setSaving(true);

    const payload = {
      name: formData.name,
      type: formData.category,
      category: formData.category,
      location: formData.location,
      capacity: Number(formData.capacity) || 0,
      description: formData.description,
      status: (formData.status || 'active').toLowerCase(),
      bookingFee: Number(formData.bookingFee) || 0,
      openTime: formData.openTime,
      closeTime: formData.closeTime,
      maxBookingsPerUserPerSlot: Number(formData.maxBookingsPerUserPerSlot) || 1,
      openDays: formData.openDays,
      imageUrl: formData.imageUrl,
      images: formData.imageUrl ? [formData.imageUrl] : [],
      pricing: {
        pricingType: formData.pricingType,
        baseRate: Number(formData.bookingFee) || 0,
        securityDeposit: Number(formData.securityDeposit) || 0,
        securityDepositDescription: formData.securityDepositDescription,
      },
      bookingRules: {
        openTime: formData.openTime,
        closeTime: formData.closeTime,
        slotDurationMinutes: Number(formData.slotDurationMinutes) || 60,
        bufferTimeMinutes: Number(formData.bufferTimeMinutes) || 0,
        advanceBookingDays: Number(formData.advanceBookingDays) || 0,
        isCancellationEnabled: formData.isCancellationEnabled,
        cancellationRefundRules: formData.cancellationRefundRules,
      },
    };

    try {
      if (editingAmenity) {
        await dispatch(updateAmenityThunk({ id: editingAmenity._id, payload })).unwrap();
      } else {
        await dispatch(createAmenityThunk(payload)).unwrap();
      }
      setSaving(false);
      handleCloseFormModal();
      loadData();
    } catch (error) {
      console.error('Failed to save amenity:', error);
      setSaving(false);
      // Let the user correct the form if it fails (e.g. backend validation)
    }
  };

  const [deactivateTarget, setDeactivateTarget] = useState<Amenity | null>(null);

  const handleToggleStatus = async (amenity: Amenity) => {
    const currentStatus = String(amenity.status || 'active').toLowerCase();
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await dispatch(updateAmenityStatusThunk({ id: amenity._id, status: nextStatus })).unwrap();
      loadData();
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to update amenity status';
      if (currentStatus === 'active' && (msg.includes('pending or approved future bookings') || msg.includes('bookings'))) {
        setDeactivateTarget(amenity);
      } else {
        Alert.alert('Status Update Error', msg);
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await dispatch(updateAmenityStatusThunk({ id: deactivateTarget._id, status: 'inactive', force: true })).unwrap();
      setDeactivateTarget(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to force deactivate amenity:', err);
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to deactivate amenity';
      Alert.alert('Deactivation Error', msg);
      setDeactivateTarget(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteAmenityThunk({ id: deleteTarget._id, force: true })).unwrap();
      setDeleteTarget(null);
      setSelectedAmenityDetail(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete amenity:', err);
      const msg = typeof err === 'string' ? err : err?.message || 'Cannot delete amenity: active or pending bookings exist.';
      Alert.alert('Delete Error', msg);
      setDeleteTarget(null);
    }
  };

  return {
    amenities,
    filteredAmenities,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    loading,
    error,
    isFormModalOpen,
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
    handleOpenEditModal,
    handleCloseFormModal,
    handleFormSubmit,
    handleToggleStatus,
    handleConfirmDeactivate,
    handleConfirmDelete,
  };
}

export default useAmenityMaster;
