import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchAmenitiesThunk,
  fetchMaintenanceListThunk,
  scheduleMaintenanceThunk,
  deleteMaintenanceTaskThunk,
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
import { convertLocalToUtcIso } from '../utils/amenityStateHelpers';

export function useAdminMaintenance() {
  const dispatch = useDispatch<AppDispatch>();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | null>(null);
  const [deleteTargetTask, setDeleteTargetTask] = useState<MaintenanceTask | null>(null);
  const [deleteTargetAmenity, setDeleteTargetAmenity] = useState<{ amenityId: string; amenityName: string } | null>(null);
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

    try {
      let finalAmenityId = amenityId;

      if (editingTask) {
        finalAmenityId = editingTask.amenityId || amenityId;
        // 1. Remove old task to avoid overlap and update cleanly
        try {
          await amenityManagementService.deleteMaintenanceBlock(editingTask._id);
        } catch (_) {
          try {
            await amenityManagementService.updateMaintenanceStatus(editingTask._id, 'CANCELLED');
          } catch (_) {}
        }
        try {
          await dispatch(
            deleteMaintenanceTaskThunk({
              amenityId: finalAmenityId,
              maintenanceId: editingTask._id,
              blockId: editingTask._id,
            })
          ).unwrap();
        } catch (_) {}
      }

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
                occurrenceCount: formData.isOngoing
                  ? formData.frequency === 'YEARLY'
                    ? 5
                    : formData.frequency === 'MONTHLY'
                    ? 12
                    : formData.frequency === 'DAILY'
                    ? 30
                    : 52
                  : Math.min(
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
          // One-Off / Multi-Window Maintenance submission
          const windowsList =
            formData.windows && formData.windows.length > 0
              ? formData.windows
              : [
                  {
                    id: '1',
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    startTime: formData.startTime || '00:00',
                    endTime: formData.endTime || '17:00',
                  },
                ];

          const v2Windows = windowsList.map((w) => {
            const sDt = new Date(`${w.startDate}T${w.startTime || '00:00'}:00`);
            const eDt = new Date(`${w.endDate || w.startDate}T${w.endTime || '17:00'}:00`);
            return {
              startDateTime: isNaN(sDt.getTime()) ? new Date().toISOString() : sDt.toISOString(),
              endDateTime: isNaN(eDt.getTime()) ? new Date(Date.now() + 86400000).toISOString() : eDt.toISOString(),
            };
          });

          // 1. Schedule via V2 API
          try {
            await amenityManagementService.scheduleMaintenance({
              facilityId: finalAmenityId,
              title: formData.title,
              reason: formData.description || formData.title,
              startDateTime: v2Windows[0].startDateTime,
              endDateTime: v2Windows[0].endDateTime,
              windows: v2Windows,
              maintenanceType: formData.maintenanceType || 'CLEANING',
              internalNotes: formData.description || undefined,
              isCompleteClosure: formData.isCompleteClosure !== false,
              degradedCapacity: formData.degradedCapacity || 0,
              conflictAction: formData.autoCancelBookings ? 'CANCEL_AND_PROCEED' : undefined,
            });
            scheduledSuccess = true;
          } catch (v2Err: any) {
            lastErrorMsg = v2Err?.response?.data?.message || v2Err?.message || '';
            console.warn('[useAdminMaintenance] V2 maintenance schedule note:', v2Err);
          }

          // 2. Also dispatch scheduleMaintenanceThunk
          try {
            await dispatch(
              scheduleMaintenanceThunk({
                facilityId: finalAmenityId,
                startDateTime: v2Windows[0].startDateTime,
                endDateTime: v2Windows[0].endDateTime,
                windows: v2Windows,
                title: formData.title,
                reason: formData.description || formData.title,
                isCompleteClosure: formData.isCompleteClosure !== false,
                degradedCapacity: formData.degradedCapacity || 0,
                conflictAction: formData.autoCancelBookings ? 'CANCEL_AND_PROCEED' : undefined,
              })
            ).unwrap();
            scheduledSuccess = true;
          } catch (thunkErr: any) {
            if (!lastErrorMsg) {
              lastErrorMsg = thunkErr?.response?.data?.message || thunkErr?.message || '';
            }
          }
        }

        if (!scheduledSuccess && lastErrorMsg) {
          setScheduling(false);
          Alert.alert('Scheduling Error', lastErrorMsg);
          return;
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

  const handleConfirmDelete = async (overrideTask?: MaintenanceTask) => {
    const targetTask = overrideTask || deleteTargetTask;
    if (!targetTask) return;
    const targetId = String(targetTask._id);
    const targetAmenityId = targetTask.amenityId;

    // 1. Optimistically remove from Redux state immediately so UI updates instantly
    dispatch(removeMaintenanceTask(targetId));
    if (deleteTargetTask) setDeleteTargetTask(null);

    let deleted = false;
    let lastError: any = null;
    try {
      // 2. Try V2 direct delete
      try {
        await amenityManagementService.deleteMaintenanceBlock(targetId);
        deleted = true;
      } catch (v2DelErr: any) {
        lastError = v2DelErr;
        // 3. Fall back to V2 status cancellation if direct delete fails
        try {
          await amenityManagementService.updateMaintenanceStatus(targetId, 'CANCELLED');
          deleted = true;
        } catch (v2StatErr: any) {
          lastError = v2StatErr;
        }
      }

      // 4. Only attempt V1 delete if not resolved in V2 and amenityId exists
      if (!deleted && targetAmenityId && targetAmenityId !== 'OTHER') {
        try {
          await dispatch(
            deleteMaintenanceTaskThunk({
              amenityId: targetAmenityId,
              maintenanceId: targetId,
              blockId: targetId,
            })
          ).unwrap();
          deleted = true;
        } catch (v1Err: any) {
          lastError = v1Err;
        }
      }

      if (!deleted && lastError) {
        const errorMsg =
          lastError?.response?.data?.message ||
          lastError?.message ||
          'Failed to cancel maintenance window. Please check server connectivity.';
        Alert.alert('Cancellation Error', errorMsg);
      }
    } catch (err: any) {
      console.warn('[useAdminMaintenance] Delete task note:', err);
    } finally {
      await loadData();
    }
  };

  const handleConfirmDeleteAll = async () => {
    if (!deleteTargetAmenity) return;
    const { amenityId, amenityName } = deleteTargetAmenity;

    // Find all active maintenance tasks for this amenity
    const tasksToCancel = maintenanceList.filter((t) => {
      const matchAmenity =
        String(t.amenityId) === String(amenityId) ||
        (t.amenityName &&
          amenityName &&
          t.amenityName.trim().toLowerCase() === amenityName.trim().toLowerCase());
      const s = String(t.status || '').toUpperCase();
      return matchAmenity && s !== 'CANCELLED' && s !== 'COMPLETED';
    });

    if (tasksToCancel.length === 0) {
      setDeleteTargetAmenity(null);
      return;
    }

    // 1. Optimistically remove all from Redux state
    tasksToCancel.forEach((task) => {
      if (task._id) {
        dispatch(removeMaintenanceTask(String(task._id)));
      }
    });
    setDeleteTargetAmenity(null);

    // 2. Concurrently cancel each task via multi-tier fallback
    try {
      await Promise.allSettled(
        tasksToCancel.map(async (task) => {
          const id = String(task._id);
          try {
            await amenityManagementService.deleteMaintenanceBlock(id);
          } catch (_) {
            try {
              await amenityManagementService.updateMaintenanceStatus(id, 'CANCELLED');
            } catch (_) {
              if (task.amenityId && task.amenityId !== 'OTHER') {
                try {
                  const amenityService = await import('../services/amenityService');
                  await amenityService.deleteMaintenanceTask(task.amenityId, id);
                } catch (_) {}
              }
            }
          }
        })
      );
    } catch (err: any) {
      console.warn('[useAdminMaintenance] Bulk delete tasks error:', err);
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
    deleteTargetAmenity,
    setDeleteTargetAmenity,
    scheduling,
    loadData,
    handleLoadMore: loadData,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
    handleScheduleSubmit,
    handleConfirmDelete,
    handleConfirmDeleteAll,
  };
}

export default useAdminMaintenance;
