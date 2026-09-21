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
  upsertAmenity,
  setMaintenanceList,
  removeMaintenanceTask,
  Amenity,
  MaintenanceTask,
} from '../store/amenitySlice';
import { MaintenanceFormData } from '../components/MaintenanceModal';
import amenityManagementService from '../services/amenityManagementService';
import { normalizeFacilityFromApi } from '../utils/amenityPayloadMappers';

export function useAdminMaintenance() {
  const dispatch = useDispatch<AppDispatch>();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | null>(null);
  const [deleteTargetTask, setDeleteTargetTask] = useState<MaintenanceTask | null>(null);
  const [scheduling, setScheduling] = useState<boolean>(false);

  const { amenities, maintenanceList, loading, error } = useSelector(
    (state: RootState) => state.amenities
  );

  const loadData = useCallback(async () => {
    // 1. Fetch V1 Amenities
    await dispatch(fetchAmenitiesThunk({})).unwrap().catch(() => null);

    // 2. Fetch V2 Facilities and sync into Redux so all amenities appear in the dropdown
    let rawFacilities: any[] = [];
    try {
      const v2Res = await amenityManagementService.getFacilities({ page: 1, limit: 100 });
      const rawPayload: any = v2Res?.data;
      rawFacilities =
        (Array.isArray(rawPayload) ? rawPayload : null) ||
        (Array.isArray(rawPayload?.data) ? rawPayload.data : null) ||
        (Array.isArray(rawPayload?.items) ? rawPayload.items : null) ||
        (Array.isArray(rawPayload?.records) ? rawPayload.records : null) ||
        (Array.isArray((v2Res as any)?.items) ? (v2Res as any).items : null) ||
        (Array.isArray((v2Res as any)?.data) ? (v2Res as any).data : null) ||
        (Array.isArray((v2Res as any)?.records) ? (v2Res as any).records : null) ||
        [];

      rawFacilities.forEach((fac) => {
        dispatch(upsertAmenity(fac));
      });
    } catch (e) {
      console.warn('[useAdminMaintenance] Failed to fetch V2 facilities:', e);
    }

    // 3. Fetch V1 Maintenance
    const v1Action = await dispatch(fetchMaintenanceListThunk());
    const v1List: MaintenanceTask[] = (v1Action.payload as any)?.data || v1Action.payload || [];
    const validV1List: MaintenanceTask[] = Array.isArray(v1List) ? v1List : [];

    // 4. Fetch V2 Maintenance Blocks and normalize
    let v2Tasks: MaintenanceTask[] = [];
    try {
      const v2MaintRes = await amenityManagementService.listMaintenanceBlocks({ limit: 100 });
      const rawMaintPayload: any = v2MaintRes?.data;
      const rawBlocks: any[] =
        (Array.isArray(rawMaintPayload) ? rawMaintPayload : null) ||
        (Array.isArray(rawMaintPayload?.records) ? rawMaintPayload.records : null) ||
        (Array.isArray(rawMaintPayload?.data) ? rawMaintPayload.data : null) ||
        (Array.isArray(rawMaintPayload?.items) ? rawMaintPayload.items : null) ||
        (Array.isArray((v2MaintRes as any)?.records) ? (v2MaintRes as any).records : null) ||
        (Array.isArray((v2MaintRes as any)?.items) ? (v2MaintRes as any).items : null) ||
        (Array.isArray((v2MaintRes as any)?.data) ? (v2MaintRes as any).data : null) ||
        [];

      v2Tasks = rawBlocks.map((b: any) => {
        const targetFacId = String(b.facilityId?._id || b.facilityId || '');
        const matchingAmenity =
          amenities.find((a) => String(a._id) === targetFacId) ||
          rawFacilities.find((f) => String(f._id) === targetFacId);
        const facilityName = matchingAmenity?.name || b.facilityId?.name || b.facilityName || 'Facility';
        const startStr = b.startDateTime ? b.startDateTime.slice(0, 10) : '';
        const endStr = b.endDateTime ? b.endDateTime.slice(0, 10) : '';
        const startTime = b.startDateTime
          ? new Date(b.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          : '';
        const endTime = b.endDateTime
          ? new Date(b.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          : '';

        const isRecurring = Boolean(b.recurringSeriesId || b.isRecurring);
        const normalizedStatus = String(b.status || 'SCHEDULED').toUpperCase();
        return {
          _id: b._id,
          amenityId: targetFacId,
          amenityName: facilityName,
          title: b.title || b.reason || 'Maintenance Upkeep',
          description: b.internalNotes || b.reason || '',
          startDate: startStr,
          endDate: endStr,
          startTime,
          endTime,
          maintenanceType: b.maintenanceType || 'CLEANING',
          recurringSeriesId: b.recurringSeriesId ? String(b.recurringSeriesId) : undefined,
          isRecurring,
          status: normalizedStatus as any,
          assignedStaff: b.assignedStaff || 'Facilities Team',
          autoCancelBookings: true,
          createdAt: b.createdAt,
        };
      }).filter((t: any) => t.status !== 'CANCELLED');
    } catch (e) {
      console.warn('[useAdminMaintenance] Failed to fetch V2 maintenance blocks:', e);
    }

    // 5. Merge V1 and V2 maintenance tasks, deduplicating by _id
    const combinedMap = new Map<string, MaintenanceTask>();
    validV1List.forEach((t) => {
      const normalizedStatus = String(t.status || 'SCHEDULED').toUpperCase();
      if (t?._id && normalizedStatus !== 'CANCELLED') {
        combinedMap.set(String(t._id), { ...t, status: normalizedStatus as any });
      }
    });
    v2Tasks.forEach((t) => {
      if (t?._id && t.status !== 'CANCELLED') {
        combinedMap.set(String(t._id), t);
      }
    });

    dispatch(setMaintenanceList(Array.from(combinedMap.values())));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = (amenityId?: string) => {
    setEditingTask(null);
    setSelectedAmenityId(amenityId || null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: MaintenanceTask) => {
    setEditingTask(task);
    setSelectedAmenityId(task.amenityId || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setSelectedAmenityId(null);
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
        if (formData.isRecurring) {
          // Convert / reschedule as recurring series
          try {
            // Cancel old single task
            try {
              await amenityManagementService.updateMaintenanceStatus(editingTask._id, 'CANCELLED');
            } catch (_) {}
            try {
              await dispatch(
                deleteMaintenanceTaskThunk({
                  amenityId: editingTask.amenityId || amenityId,
                  maintenanceId: editingTask._id,
                })
              ).unwrap();
            } catch (_) {}

            const startDt = new Date(`${formData.startDate}T${formData.startTime || '08:00'}:00`);
            const endDt = new Date(`${formData.startDate}T${formData.endTime || '18:00'}:00`);

            const recurringPayload: any = {
              facilityId: editingTask.amenityId || amenityId,
              title: formData.title.trim(),
              reason: (formData.description || formData.title).trim(),
              maintenanceType: formData.maintenanceType || 'CLEANING',
              internalNotes: formData.description?.trim() || undefined,
              startDateTime: isNaN(startDt.getTime()) ? new Date().toISOString() : startDt.toISOString(),
              endDateTime: isNaN(endDt.getTime()) ? new Date(Date.now() + 86400000).toISOString() : endDt.toISOString(),
              bufferBeforeMinutes: 0,
              bufferAfterMinutes: 0,
              isCompleteClosure: true,
              degradedCapacity: 0,
              recurrence: {
                frequency: formData.frequency || 'WEEKLY',
                interval: Number(formData.interval) || 1,
                occurrenceCount: Math.min(
                  Math.max(
                    Number(formData.occurrenceCount) ||
                      (formData.frequency === 'YEARLY' ? 5 : formData.frequency === 'DAILY' ? 14 : 8),
                    1
                  ),
                  60
                ),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                ...(formData.frequency === 'WEEKLY'
                  ? { daysOfWeek: formData.selectedDays?.length ? formData.selectedDays : [1] }
                  : {}),
                ...(formData.frequency === 'MONTHLY'
                  ? { dayOfMonth: Number(formData.dayOfMonth) || 1 }
                  : {}),
              },
              conflictAction: formData.autoCancelBookings ? 'CANCEL_AND_PROCEED' : undefined,
            };

            await amenityManagementService.scheduleRecurringMaintenance(recurringPayload);
          } catch (recErr: any) {
            const lastErrorMsg = recErr?.response?.data?.message || recErr?.message || 'Failed to update recurring series';
            setScheduling(false);
            Alert.alert('Recurring Schedule Error', lastErrorMsg);
            return;
          }
        } else {
          // Standard one-off update
          try {
            await amenityManagementService.updateMaintenanceStatus(editingTask._id, 'SCHEDULED');
          } catch (_) {}
          // Also update V1
          await dispatch(
            updateMaintenanceTaskThunk({
              amenityId: editingTask.amenityId || amenityId,
              maintenanceId: editingTask._id,
              payload,
            })
          ).unwrap();
        }
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

        let scheduledSuccess = false;
        let lastErrorMsg = '';

        if (formData.isRecurring) {
          // Recurring maintenance series
          try {
            const startDt = new Date(`${formData.startDate}T${formData.startTime || '08:00'}:00`);
            const endDt = new Date(`${formData.startDate}T${formData.endTime || '18:00'}:00`);

            const recurringPayload: any = {
              facilityId: finalAmenityId,
              title: formData.title.trim(),
              reason: (formData.description || formData.title).trim(),
              maintenanceType: formData.maintenanceType || 'CLEANING',
              internalNotes: formData.description?.trim() || undefined,
              startDateTime: isNaN(startDt.getTime()) ? new Date().toISOString() : startDt.toISOString(),
              endDateTime: isNaN(endDt.getTime()) ? new Date(Date.now() + 86400000).toISOString() : endDt.toISOString(),
              bufferBeforeMinutes: 0,
              bufferAfterMinutes: 0,
              isCompleteClosure: true,
              degradedCapacity: 0,
              recurrence: {
                frequency: formData.frequency || 'WEEKLY',
                interval: Number(formData.interval) || 1,
                occurrenceCount: Math.min(
                  Math.max(
                    Number(formData.occurrenceCount) ||
                      (formData.frequency === 'YEARLY' ? 5 : formData.frequency === 'DAILY' ? 14 : 8),
                    1
                  ),
                  60
                ),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                ...(formData.frequency === 'WEEKLY'
                  ? { daysOfWeek: formData.selectedDays?.length ? formData.selectedDays : [1] }
                  : {}),
                ...(formData.frequency === 'MONTHLY'
                  ? { dayOfMonth: Number(formData.dayOfMonth) || 1 }
                  : {}),
              },
              conflictAction: formData.autoCancelBookings ? 'CANCEL_AND_PROCEED' : undefined,
            };

            await amenityManagementService.scheduleRecurringMaintenance(recurringPayload);
            scheduledSuccess = true;
          } catch (recErr: any) {
            lastErrorMsg = recErr?.response?.data?.message || recErr?.message || '';
            console.warn('[useAdminMaintenance] Recurring schedule error:', recErr);
          }
        } else {
          // One-Off Maintenance submission
          // Try scheduling in V2
          try {
            const startDt = new Date(`${formData.startDate}T${formData.startTime || '08:00'}:00`);
            const endDt = new Date(`${formData.endDate}T${formData.endTime || '18:00'}:00`);
            await amenityManagementService.scheduleMaintenance({
              facilityId: finalAmenityId,
              title: formData.title,
              reason: formData.description || formData.title,
              startDateTime: isNaN(startDt.getTime()) ? new Date().toISOString() : startDt.toISOString(),
              endDateTime: isNaN(endDt.getTime()) ? new Date(Date.now() + 86400000).toISOString() : endDt.toISOString(),
              maintenanceType: formData.maintenanceType || 'CLEANING',
              internalNotes: formData.description || undefined,
              conflictAction: formData.autoCancelBookings ? 'CANCEL_AND_PROCEED' : undefined,
            });
            scheduledSuccess = true;
          } catch (v2Err: any) {
            lastErrorMsg = v2Err?.response?.data?.message || v2Err?.message || '';
            console.warn('[useAdminMaintenance] V2 maintenance schedule note:', v2Err);
          }

          // Also schedule in V1 so both V1 and V2 are updated
          try {
            await dispatch(
              scheduleMaintenanceThunk({
                id: finalAmenityId,
                payload,
              })
            ).unwrap();
            scheduledSuccess = true;
          } catch (v1Err: any) {
            if (!lastErrorMsg) {
              lastErrorMsg = v1Err?.response?.data?.message || v1Err?.message || '';
            }
          }
        }

        if (!scheduledSuccess && lastErrorMsg) {
          setScheduling(false);
          Alert.alert('Scheduling Error', lastErrorMsg);
          return;
        }
      }

      setScheduling(false);
      handleCloseModal();
      await loadData();
    } catch (err: any) {
      setScheduling(false);
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to schedule maintenance task';
      Alert.alert('Maintenance Error', msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetTask) return;
    const targetId = String(deleteTargetTask._id);
    const targetAmenityId = deleteTargetTask.amenityId;

    // 1. Optimistically remove from Redux state immediately so UI updates instantly
    dispatch(removeMaintenanceTask(targetId));
    setDeleteTargetTask(null);

    let deleted = false;
    try {
      // 2. Try V2 direct delete
      try {
        await amenityManagementService.deleteMaintenanceBlock(targetId);
        deleted = true;
      } catch (v2DelErr: any) {
        // 3. Fall back to V2 status cancellation if direct delete fails
        try {
          await amenityManagementService.updateMaintenanceStatus(targetId, 'CANCELLED');
          deleted = true;
        } catch (_) {}
      }

      // 4. Only attempt V1 delete if not resolved in V2 and amenityId exists
      if (!deleted && targetAmenityId && targetAmenityId !== 'OTHER') {
        try {
          await dispatch(
            deleteMaintenanceTaskThunk({
              amenityId: targetAmenityId,
              maintenanceId: targetId,
            })
          ).unwrap();
          deleted = true;
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('[useAdminMaintenance] Delete task note:', err);
    } finally {
      await loadData();
    }
  };

  return {
    amenities,
    maintenanceList,
    loading,
    error,
    isModalOpen,
    editingTask,
    selectedAmenityId,
    deleteTargetTask,
    setDeleteTargetTask,
    scheduling,
    loadData,
    handleLoadMore: loadData,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleScheduleSubmit,
    handleConfirmDelete,
  };
}

export default useAdminMaintenance;
