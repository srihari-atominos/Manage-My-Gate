import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAmenitiesThunk,
  fetchMaintenanceListThunk,
  scheduleMaintenanceThunk,
  updateMaintenanceTaskThunk,
  deleteMaintenanceTaskThunk,
  updateAmenityStatusThunk,
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

    if (editingTask) {
      await dispatch(
        updateMaintenanceTaskThunk({
          amenityId: editingTask.amenityId || amenityId,
          maintenanceId: editingTask._id,
          payload,
        })
      );
    } else {
      await dispatch(
        scheduleMaintenanceThunk({
          id: amenityId,
          payload,
        })
      );
      await dispatch(
        updateAmenityStatusThunk({ id: amenityId, status: 'MAINTENANCE' })
      );
    }

    setScheduling(false);
    handleCloseModal();
    loadData();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetTask) return;
    await dispatch(
      deleteMaintenanceTaskThunk({
        amenityId: deleteTargetTask.amenityId,
        maintenanceId: deleteTargetTask._id,
      })
    );
    setDeleteTargetTask(null);
    loadData();
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
