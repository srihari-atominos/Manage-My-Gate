/**
 * Amenity Management Phase 6B.2 - Step: Booking Result View
 * Authoritative presentation of the 5 independent reservation dimensions.
 * Renders access pass QR code when eligible. Zero fabricated tokens or flattened statuses.
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { QRCodeView } from '@/components/ui/QRCodeView';
import {
  AmenityFacility,
  AmenityReservation,
  AmenityAccessPass,
} from '../../../types/amenityDomain.types';
import {
  formatApprovalStatusLabel,
  formatAccessStatusLabel,
  formatCompletionStatusLabel,
  formatBookingStatusLabel,
  formatPaymentStatusLabel,
  formatReservationDate,
  formatReservationTimeRange,
} from '../../../utils/amenityStateHelpers';
import { CheckCircle2, AlertCircle, Clock, QrCode } from 'lucide-react-native';

export interface BookingResultViewProps {
  facility: AmenityFacility;
  reservation: AmenityReservation | null;
  accessPasses: AmenityAccessPass[];
  isPassEligible: boolean;
  onDone: () => void;
  onViewBookings: () => void;
}

export function BookingResultView({
  facility,
  reservation,
  accessPasses,
  isPassEligible,
  onDone,
  onViewBookings,
}: BookingResultViewProps) {
  if (!reservation) {
    return (
      <View className="items-center justify-center p-6">
        <Text variant="muted">No reservation details available.</Text>
      </View>
    );
  }

  const isPendingApproval = reservation.bookingStatus === 'PENDING_APPROVAL';
  const isConfirmed = reservation.bookingStatus === 'CONFIRMED';
  const isRejected = reservation.bookingStatus === 'REJECTED';

  const primaryPass = accessPasses?.[0];

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-8">
      {/* Hero Status Card */}
      <View
        className={`items-center rounded-3xl border p-6 text-center ${
          isConfirmed
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : isPendingApproval
              ? 'border-amber-500/30 bg-amber-500/10'
              : 'border-destructive/30 bg-destructive/10'
        }`}>
        <View
          className={`mb-3 h-14 w-14 items-center justify-center rounded-full ${
            isConfirmed
              ? 'bg-emerald-500/20'
              : isPendingApproval
                ? 'bg-amber-500/20'
                : 'bg-destructive/20'
          }`}>
          {isConfirmed ? (
            <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
          ) : isPendingApproval ? (
            <Clock size={32} className="text-amber-600 dark:text-amber-400" />
          ) : (
            <AlertCircle size={32} className="text-destructive" />
          )}
        </View>

        <Text variant="h2" className="text-center font-bold text-foreground">
          {isConfirmed
            ? 'Reservation Confirmed!'
            : isPendingApproval
              ? 'Booking Pending Review'
              : 'Reservation Rejected'}
        </Text>

        <Text variant="muted" className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          {isConfirmed
            ? 'Your facility reservation is active. Keep your pass ready for gate access.'
            : isPendingApproval
              ? 'Your request requires administrative approval. You will be notified once reviewed.'
              : reservation.rejectionReason || 'Your booking request could not be approved.'}
        </Text>
      </View>

      {/* Access Pass QR Presentation (When Eligible & Returned) */}
      {isPassEligible && primaryPass?.qrData ? (
        <View className="items-center gap-3 rounded-3xl border border-border bg-card p-6">
          <View className="flex-row items-center gap-2">
            <QrCode size={18} className="text-primary" />
            <Text className="font-bold text-sm text-foreground">Digital Access Pass</Text>
          </View>

          <QRCodeView
            value={primaryPass.qrData}
            size={180}
            caption={`Pass Code: ${primaryPass.passCode}`}
          />

          <View className="mt-1 flex-row items-center gap-2">
            <StatusBadge label={primaryPass.status || 'ACTIVE'} variant="success" dot />
            <Text variant="muted" className="text-[11px]">
              Valid until: {new Date(primaryPass.validUntil).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Five Orthogonal Reservation Dimensions */}
      <DetailSection
        title="Authoritative Reservation States"
        className="border border-border bg-card">
        <DetailRow
          label="Booking Status"
          value={
            <StatusBadge
              label={formatBookingStatusLabel(reservation.bookingStatus)}
              variant={isConfirmed ? 'success' : isPendingApproval ? 'warning' : 'danger'}
            />
          }
        />
        <DetailRow
          label="Payment Status"
          value={
            <StatusBadge
              label={formatPaymentStatusLabel(reservation.paymentStatus)}
              variant={
                reservation.paymentStatus === 'PAID' || reservation.paymentStatus === 'NOT_REQUIRED'
                  ? 'success'
                  : reservation.paymentStatus === 'FAILED'
                    ? 'danger'
                    : 'warning'
              }
            />
          }
        />
        <DetailRow
          label="Approval Status"
          value={
            <StatusBadge
              label={formatApprovalStatusLabel(reservation.approvalStatus)}
              variant={
                reservation.approvalStatus === 'APPROVED' ||
                reservation.approvalStatus === 'NOT_REQUIRED'
                  ? 'success'
                  : reservation.approvalStatus === 'REJECTED'
                    ? 'danger'
                    : 'warning'
              }
            />
          }
        />
        <DetailRow
          label="Access Status"
          value={
            <StatusBadge
              label={formatAccessStatusLabel(reservation.accessStatus)}
              variant={
                reservation.accessStatus === 'PASS_GENERATED' ||
                reservation.accessStatus === 'CHECKED_IN'
                  ? 'success'
                  : reservation.accessStatus === 'ACCESS_REVOKED'
                    ? 'danger'
                    : 'neutral'
              }
            />
          }
        />
        <DetailRow
          label="Completion Status"
          value={
            <StatusBadge
              label={formatCompletionStatusLabel(reservation.completionStatus)}
              variant={
                reservation.completionStatus === 'COMPLETED'
                  ? 'success'
                  : reservation.completionStatus === 'NO_SHOW' ||
                      reservation.completionStatus === 'ABANDONED'
                    ? 'danger'
                    : 'neutral'
              }
            />
          }
          isLast
        />
      </DetailSection>

      {/* Booking Summary */}
      <DetailSection title="Booking Details" className="border border-border bg-card">
        <DetailRow label="Facility" value={facility.name} />
        {reservation.reservationNumber ? (
          <DetailRow label="Reservation #" value={reservation.reservationNumber} />
        ) : null}
        {formatReservationDate(
          reservation.startDateTime || (reservation as any).effectiveStartDateTime,
          facility.timezone || reservation.facilityTimezone || 'Asia/Kolkata'
        ) ? (
          <DetailRow
            label="Date"
            value={formatReservationDate(
              reservation.startDateTime || (reservation as any).effectiveStartDateTime,
              facility.timezone || reservation.facilityTimezone || 'Asia/Kolkata'
            )}
          />
        ) : null}
        {formatReservationTimeRange(
          reservation.startDateTime || (reservation as any).effectiveStartDateTime,
          reservation.endDateTime || (reservation as any).effectiveEndDateTime,
          facility.timezone || reservation.facilityTimezone || 'Asia/Kolkata'
        ) ? (
          <DetailRow
            label="Time"
            value={formatReservationTimeRange(
              reservation.startDateTime || (reservation as any).effectiveStartDateTime,
              reservation.endDateTime || (reservation as any).effectiveEndDateTime,
              facility.timezone || reservation.facilityTimezone || 'Asia/Kolkata'
            )}
          />
        ) : null}
        <DetailRow label="Headcount" value={String(reservation.headcount || 1)} />
        {reservation.paymentReference ? (
          <DetailRow label="Payment Ref" value={reservation.paymentReference} isLast />
        ) : null}
      </DetailSection>

      {/* Action Buttons */}
      <View className="gap-2.5 pt-2">
        <Button variant="default" onPress={onViewBookings} className="h-12 w-full rounded-xl">
          <Text className="font-bold text-base text-primary-foreground">View My Bookings</Text>
        </Button>

        <Button
          variant="outline"
          onPress={onDone}
          className="h-12 w-full rounded-xl"
          accessibilityRole="button"
          accessibilityLabel="Close and return to front page"
        >
          <Text className="font-semibold text-foreground">Close</Text>
        </Button>
      </View>
    </ScrollView>
  );
}

export default BookingResultView;
