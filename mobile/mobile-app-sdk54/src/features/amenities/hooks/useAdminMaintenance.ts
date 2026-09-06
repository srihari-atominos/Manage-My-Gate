import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAmenitiesThunk,
  fetchMaintenanceListThunk,
  scheduleMaintenanceThunk,
  updateMaintenanceTaskThunk,
  deleteMaintenanceTaskThunk,
  updateAmenityStatusThunk,
  createAmenityThunk,
  Amenity,
  MaintenanceTask,
} from '../store/amenitySlice';
import { MaintenanceFormData } from '../components/MaintenanceModal';

export function useAdminMaintenance() {
  const dispatch = useDispatch<AppDispatch>();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [deleteTargetTask, setDeleteTargetTask] = useState<MaintenanceTask | null>(null);
  const [scheduling, setScheduling] = useState<boolean>(false);

  const { amenities, maintenanceList, loading, error } = useSelector(
    (state: RootState) => state.amenities
  );

  const loadData = useCallback(() => {
    dispatch(fetchAmenitiesThunk({}));
    dispatch(fetchMaintenanceListThunk());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: MaintenanceTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleScheduleSubmit = async (amenityId: string, formData: MaintenanceFormData) => {
    setScheduling(true);

    const payload = {
      title: formData.title,
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      description: formData.description,
      assignedStaff: formData.assignedStaff,
      autoCancelBookings: formData.autoCancelBookings,
    };

    try {
      if (editingTask) {
        await dispatch(
          updateMaintenanceTaskThunk({
            amenityId: editingTask.amenityId || amenityId,
            maintenanceId: editingTask._id,
            payload,
          })
        ).unwrap();
      } else {
        let finalAmenityId = amenityId;
        if (amenityId === 'OTHER' && formData.customAmenityName) {
          const createResult: any = await dispatch(
            createAmenityThunk({
              name: formData.customAmenityName,
              category: 'General',
              type: 'General',
              capacity: 10,
              maxBookingsPerUserPerSlot: 10,
              bookingRules: {
                slotDurationMinutes: 60,
                openTime: '00:00',
                closeTime: '23:59',
                advanceBookingDays: 30,
              },
              status: 'active',
            })
          ).unwrap();
          finalAmenityId = createResult?._id || createResult?.data?._id || createResult?.id;
          if (!finalAmenityId) {
            setScheduling(false);
            Alert.alert('Error', 'Failed to create custom amenity for maintenance');
            return;
          }
        }

        await dispatch(
          scheduleMaintenanceThunk({
            id: finalAmenityId,
            payload,
          })
        ).unwrap();
        await dispatch(
          updateAmenityStatusThunk({ id: finalAmenityId, status: 'MAINTENANCE' })
        ).unwrap();
      }

      setScheduling(false);
      handleCloseModal();
      loadData();
    } catch (err: any) {
      setScheduling(false);
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to schedule maintenance task';
      Alert.alert('Maintenance Error', msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetTask) return;
    try {
      await dispatch(
        deleteMaintenanceTaskThunk({
          amenityId: deleteTargetTask.amenityId,
          maintenanceId: deleteTargetTask._id,
        })
      ).unwrap();
      setDeleteTargetTask(null);
      loadData();
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to delete maintenance task';
      Alert.alert('Delete Error', msg);
      setDeleteTargetTask(null);
    }
  };

  return {
    amenities,
    maintenanceList,
    loading,
    error,
    isModalOpen,
    editingTask,
    deleteTargetTask,
    setDeleteTargetTask,
    scheduling,
    loadData,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleScheduleSubmit,
    handleConfirmDelete,
  };
}

export default useAdminMaintenance;
