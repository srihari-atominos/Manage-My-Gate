import { useState, useMemo, useCallback, useEffect } from 'react';
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

  const handleFormSubmit = async (data: Partial<Amenity>) => {
    setSaving(true);
    try {
      if (editingAmenity) {
        await dispatch(updateAmenityThunk({ id: editingAmenity._id, payload: data })).unwrap();
      } else {
        await dispatch(createAmenityThunk(data)).unwrap();
      }
      handleCloseFormModal();
    } catch (err) {
      console.error('Failed to save amenity', err);
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
      const newStatus = deactivateTarget.status === 'Active' ? 'Inactive' : 'Active';
      await dispatch(updateAmenityStatusThunk({ id: deactivateTarget._id, status: newStatus })).unwrap();
      setDeactivateTarget(null);
    } catch (err) {
      console.error('Failed to change status', err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await dispatch(deleteAmenityThunk({ id: deleteTarget._id })).unwrap();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete amenity', err);
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
