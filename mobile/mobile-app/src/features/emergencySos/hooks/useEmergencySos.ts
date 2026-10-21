import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchActiveSos,
  triggerEmergencySos,
  cancelEmergencySos,
  openSosModal,
  closeSosModal,
  clearSosError,
} from '../store/emergencySosSlice';
import { SosAlertType } from '../types/emergencySos.types';
import { useAuth } from '../../auth/hooks/useAuth';

export const useEmergencySos = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  const sosState = useSelector((state: RootState) => (state as any).emergencySos);

  const activeAlert = sosState?.activeAlert || null;
  const isLoading = sosState?.isLoading || false;
  const isTriggering = sosState?.isTriggering || false;
  const error = sosState?.error || null;
  const isModalOpen = sosState?.isModalOpen || false;

  const [locationCoords, setLocationCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  // Fetch active SOS when user is authenticated
  useEffect(() => {
    if (user) {
      dispatch(fetchActiveSos());
    }
  }, [dispatch, user]);

  // Request & capture background/foreground location
  const refreshLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocationCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch {
      // Location capture fails silently on emulator or permission denied
    }
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  const triggerSos = useCallback(
    async (alertType: SosAlertType = 'Security', customNotes?: string) => {
      const userAny = user as any;
      const unitNumber =
        userAny?.villaNumber ||
        userAny?.activeVillaNumber ||
        userAny?.unitNumber ||
        'Unit Not Set';

      // Re-check quick coords if not present
      let coords = locationCoords;
      if (!coords.latitude) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setLocationCoords(coords);
        } catch {
          // ignore
        }
      }

      return dispatch(
        triggerEmergencySos({
          alertType,
          unitNumber,
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: customNotes || '',
        })
      );
    },
    [dispatch, user, locationCoords]
  );

  const cancelSos = useCallback(
    async (id?: string) => {
      const targetId = id || activeAlert?._id;
      if (!targetId) return;
      return dispatch(cancelEmergencySos(targetId));
    },
    [dispatch, activeAlert]
  );

  return {
    activeAlert,
    isLoading,
    isTriggering,
    error,
    isModalOpen,
    locationCoords,
    openModal: () => dispatch(openSosModal()),
    closeModal: () => dispatch(closeSosModal()),
    clearError: () => dispatch(clearSosError()),
    triggerSos,
    cancelSos,
    refreshActiveSos: () => dispatch(fetchActiveSos()),
  };
};

export default useEmergencySos;
