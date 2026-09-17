/**
 * ResidentReservationCard Component
 * Modern Phase 6C.1 card representing an AmenityReservation.
 * Renders facility details, timing, reservation number, and all five orthogonal status dimensions.
 * Built strictly on top of the catalog's <ListCard> and <StatusBadge>.
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import { Calendar, Clock, Users, ShieldAlert, Sparkles } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  AmenityReservation,
  AmenityBookingStatus,
  AmenityPaymentStatus,
  AmenityApprovalStatus,
  AmenityAccessStatus,
  AmenityCompletionStatus,
} from '../types/amenityDomain.types';
import { formatUtcToLocalDisplay } from '../utils/amenityStateHelpers';

export interface ResidentReservationCardProps {
  reservation: AmenityReservation;
  onPress?: (reservation: AmenityReservation) => void;
  onCancelPress?: (reservation: AmenityReservation) => void;
  testID?: string;
}

export function getBookingStatusVariant(status: AmenityBookingStatus): StatusVariant {
  switch (status) {
    case 'CONFIRMED':
      return 'success';
    case 'PENDING_APPROVAL':
      return 'warning';
    case 'CANCELLED':
    case 'REJECTED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getPaymentStatusVariant(status: AmenityPaymentStatus): StatusVariant {
  switch (status) {
    case 'PAID':
    case 'NOT_REQUIRED':
      return 'success';
    case 'HELD_AUTHORIZED':
      return 'info';
    case 'PENDING':
    case 'REFUND_PENDING':
      return 'warning';
    case 'REFUNDED':
      return 'neutral';
    case 'FAILED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getApprovalStatusVariant(status: AmenityApprovalStatus): StatusVariant {
  switch (status) {
    case 'APPROVED':
    case 'NOT_REQUIRED':
      return 'success';
    case 'PENDING_REVIEW':
      return 'warning';
    case 'REJECTED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getAccessStatusVariant(status: AmenityAccessStatus): StatusVariant {
  switch (status) {
    case 'PASS_GENERATED':
      return 'success';
    case 'CHECKED_IN':
      return 'info';
    case 'CHECKED_OUT':
    case 'NOT_APPLICABLE':
      return 'neutral';
    case 'ACCESS_REVOKED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getCompletionStatusVariant(status: AmenityCompletionStatus): StatusVariant {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
      return 'neutral';
    case 'NO_SHOW':
    case 'ABANDONED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function ResidentReservationCard({
  reservation,
  onPress,
  onCancelPress,
  testID,
}: ResidentReservationCardProps) {
  const facilityName = reservation.facilityName || 'Amenity Facility';
  const resourceName = reservation.resourceName;
  const reservationNumber = reservation.reservationNumber || reservation._id;

  // Format date & time components
  const startDisplay = formatUtcToLocalDisplay(
    reservation.startDateTime || (reservation as any).effectiveStartDateTime || (reservation as any).requestedStartDateTime
  );
  const endDisplay = formatUtcToLocalDisplay(
    reservation.endDateTime || (reservation as any).effectiveEndDateTime || (reservation as any).requestedEndDateTime
  );

  const formattedDate = startDisplay.dateStr || 'Scheduled Date';
  const formattedTimeRange = startDisplay.timeStr && endDisplay.timeStr
    ? `${startDisplay.timeStr} - ${endDisplay.timeStr}`
    : startDisplay.timeStr || 'Time Scheduled';

  // Determine cancellation eligibility
  const isCancellable =
    reservation.bookingStatus !== 'CANCELLED' &&
    reservation.bookingStatus !== 'REJECTED' &&
    reservation.completionStatus !== 'COMPLETED' &&
    reservation.accessStatus !== 'CHECKED_OUT';

  const handleCardPress = () => {
    if (onPress) {
      onPress(reservation);
    }
  };

  const handleCancelPress = (e: any) => {
    e?.stopPropagation?.();
    if (onCancelPress) {
      onCancelPress(reservation);
    }
  };

  return (
    <ListCard
      testID={testID}
      title={facilityName}
      subtitle={resourceName ? `${resourceName} • ${reservationNumber}` : reservationNumber}
      status={{
        label: reservation.bookingStatus,
        variant: getBookingStatusVariant(reservation.bookingStatus),
      }}
      secondaryBadge={{
        label: reservation.paymentStatus,
        variant: getPaymentStatusVariant(reservation.paymentStatus),
      }}
      onPress={handleCardPress}
      accessibilityRole="button"
      accessibilityLabel={`Reservation for ${facilityName}, Number ${reservationNumber}`}
    >
      <View className="pt-2.5 mt-1 border-t border-border/50 gap-2.5">
        {/* Schedule & Headcount Row */}
        <View className="flex-row items-center justify-between flex-wrap gap-2">
          <View className="flex-row items-center gap-1.5">
            <Icon as={Calendar} size={14} className="text-muted-foreground" />
            <Text variant="muted" className="text-xs font-medium">
              {formattedDate}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon as={Clock} size={14} className="text-muted-foreground" />
            <Text variant="muted" className="text-xs font-medium">
              {formattedTimeRange}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Icon as={Users} size={14} className="text-muted-foreground" />
            <Text variant="muted" className="text-xs font-medium">
              {reservation.headcount || 1} {reservation.headcount === 1 ? 'Guest' : 'Guests'}
            </Text>
          </View>
        </View>

        {/* The Five Orthogonal State Dimensions Grid */}
        <View className="bg-muted/40 p-2.5 rounded-xl border border-border/40 gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text variant="muted" className="text-[11px] font-medium text-muted-foreground">
              Approval:
            </Text>
            <StatusBadge
              label={reservation.approvalStatus}
              variant={getApprovalStatusVariant(reservation.approvalStatus)}
              size="sm"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text variant="muted" className="text-[11px] font-medium text-muted-foreground">
              Access:
            </Text>
            <StatusBadge
              label={reservation.accessStatus}
              variant={getAccessStatusVariant(reservation.accessStatus)}
              size="sm"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text variant="muted" className="text-[11px] font-medium text-muted-foreground">
              Completion:
            </Text>
            <StatusBadge
              label={reservation.completionStatus}
              variant={getCompletionStatusVariant(reservation.completionStatus)}
              size="sm"
            />
          </View>
        </View>

        {/* Action Row */}
        {onCancelPress && isCancellable ? (
          <View className="flex-row justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onPress={handleCancelPress}
              className="border-destructive/40 active:bg-destructive/10 px-3 py-1.5 rounded-xl"
              accessibilityRole="button"
              accessibilityLabel={`Cancel reservation ${reservationNumber}`}
            >
              <Text className="text-destructive font-semibold text-xs">Cancel Booking</Text>
            </Button>
          </View>
        ) : null}
      </View>
    </ListCard>
  );
}

export default ResidentReservationCard;
