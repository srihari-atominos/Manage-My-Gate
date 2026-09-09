/**
 * Standalone Reservation Detail Route: /(resident)/amenities/reservations/[id]
 * Phase 6C.3 - Resident Reservation Detail & Digital Access Pass Screen.
 * Uses server-authoritative state via useResidentReservationDetail and v2 thunks.
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { EmptyState } from '@/components/feedback/EmptyState';
import { CalendarX } from 'lucide-react-native';
import { useResidentReservationDetail } from '@/src/features/amenities/hooks/useResidentReservationDetail';
import { ResidentReservationDetailView } from '@/src/features/amenities/components/ResidentReservationDetailView';
import { ResidentCancelModal } from '@/src/features/amenities/components/ResidentCancelModal';

export default function ReservationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    reservation,
    accessPasses,
    loading,
    isRefreshing,
    isCancelling,
    cancelModalOpen,
    setCancelModalOpen,
    error,
    isCancellable,
    refresh,
    cancelReservation,
    clearError,
  } = useResidentReservationDetail(id);

  const handleConfirmCancel = useCallback(
    async (reason?: string) => {
      try {
        await cancelReservation(reason);
      } catch {
        // Error is surfaced through error state
      }
    },
    [cancelReservation]
  );

  const handleRetry = useCallback(() => {
    clearError();
    refresh();
  }, [clearError, refresh]);

  return (
    <ScreenShell
      title="Reservation Details"
      subtitle={reservation?.facilityName || 'Amenity Booking'}
      iconName="CalendarCheck"
      loading={loading && !reservation}
      error={error?.message || null}
      onRetry={handleRetry}
      scrollable={false}
    >
      {!reservation && !loading ? (
        <View className="flex-1 items-center justify-center p-4">
          <EmptyState
            icon={CalendarX}
            title="Reservation Not Found"
            description="The requested reservation could not be found or you do not have permission to view it."
            actionLabel="Back to My Bookings"
            onAction={() => router.back()}
          />
        </View>
      ) : reservation ? (
        <View className="flex-1 bg-background">
          <ResidentReservationDetailView
            reservation={reservation}
            accessPasses={accessPasses}
            isCancellable={isCancellable}
            onCancelPress={() => setCancelModalOpen(true)}
            testID="reservation-detail-view"
          />

          <ResidentCancelModal
            visible={cancelModalOpen}
            reservation={reservation}
            onClose={() => setCancelModalOpen(false)}
            onConfirm={handleConfirmCancel}
            loading={isCancelling}
            testID="resident-detail-cancel-modal"
          />
        </View>
      ) : null}
    </ScreenShell>
  );
}
