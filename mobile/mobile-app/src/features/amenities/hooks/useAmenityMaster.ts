import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { 
  fetchAmenitiesThunk, 
  createAmenityThunk, 
  updateAmenityThunk, 
  deleteAmenityThunk,
  updateAmenityStatusThunk,
  Amenity 
} from '../store/amenitySlice';

export const useAmenityMaster = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { amenities, loading, error } = useSelector((state: RootState) => state.amenities);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  
  const [selectedAmenityDetail, setSelectedAmenityDetail] = useState<Amenity | null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<Amenity | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Amenity | null>(null);
  
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(() => {
    dispatch(fetchAmenitiesThunk({}));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAmenities = useMemo(() => {
    return amenities.filter(amenity => {
      const matchesSearch = amenity.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || amenity.type === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [amenities, search, selectedCategory]);

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

  const handleFormSubmit = async (data: any) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        type: data.type || data.category,
        location: data.location,
        description: data.description,
        capacity: Number(data.capacity),
        status: data.status,
        maxBookingsPerUserPerSlot: Number(data.maxBookingsPerUserPerSlot),
        openDays: data.openDays,
        images: data.imageUrl ? [data.imageUrl] : [],
        pricing: {
          pricingType: data.pricingType,
          baseRate: Number(data.bookingFee),
          securityDeposit: Number(data.securityDeposit),
          securityDepositDescription: data.securityDepositDescription,
        },
        bookingRules: {
          openTime: data.openTime,
          closeTime: data.closeTime,
          slotDurationMinutes: Number(data.slotDurationMinutes),
          bufferTimeMinutes: Number(data.bufferTimeMinutes),
          advanceBookingDays: Number(data.advanceBookingDays),
          isCancellationEnabled: data.isCancellationEnabled,
          cancellationRefundRules: data.cancellationRefundRules?.map((rule: any) => ({
            cancelBeforeHours: Number(rule.cancelBeforeHours),
            refundPercentage: Number(rule.refundPercentage)
          })) || [],
        }
      };

      if (editingAmenity) {
        await dispatch(updateAmenityThunk({ id: editingAmenity._id, payload })).unwrap();
        Alert.alert('Success', 'Amenity updated successfully');
      } else {
        await dispatch(createAmenityThunk(payload)).unwrap();
        Alert.alert('Success', 'Amenity created successfully');
      }
      handleCloseFormModal();
    } catch (err: any) {
      console.error('Failed to save amenity', err);
      Alert.alert('Error', typeof err === 'string' ? err : err.message || 'Failed to save amenity. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (amenity: Amenity) => {
    setDeactivateTarget(amenity);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setSaving(true);
    try {
      const currentStatus = (deactivateTarget.status || '').toLowerCase();
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await dispatch(updateAmenityStatusThunk({ id: deactivateTarget._id, status: newStatus })).unwrap();
      Alert.alert('Success', `Amenity ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      setDeactivateTarget(null);
    } catch (err: any) {
      console.error('Failed to change status', err);
      Alert.alert('Error', typeof err === 'string' ? err : err.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await dispatch(deleteAmenityThunk({ id: deleteTarget._id })).unwrap();
      Alert.alert('Success', 'Amenity deleted successfully');
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Failed to delete amenity', err);
      Alert.alert('Error', typeof err === 'string' ? err : err?.message || 'Failed to delete amenity');
    } finally {
      setSaving(false);
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
};

export default useAmenityMaster;
