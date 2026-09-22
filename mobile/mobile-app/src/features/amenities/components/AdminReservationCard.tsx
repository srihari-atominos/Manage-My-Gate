import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';
import { AmenityBooking } from '../store/amenityBookingSlice';
import { formatTimeRange12Hour } from '../utils/amenityStateHelpers';

export interface AdminReservationCardProps {
  booking: AmenityBooking;
  onPress: (booking: AmenityBooking) => void;
  isConflicted?: boolean;
  className?: string;
}

/**
 * AdminReservationCard Component
 * Canonical summary card for Admin Calendar viewing & monitoring.
 * Displays Facility, Resource, Time slot, Resident name, Villa/Unit, Status, Payment status, and Ref ID.
 * Strictly no action/cancel buttons.
 */
export function AdminReservationCard({
  booking,
  onPress,
  isConflicted = false,
  className,
}: AdminReservationCardProps) {
  if (!booking) return null;

  const isMaintenance = booking.type === 'maintenance';

  const facilityName =
    typeof booking.amenityId === 'object' && booking.amenityId
      ? booking.amenityId.name
      : booking.amenityName || 'Facility';

  const resourceName = booking.resourceName || null;

  const residentName =
    booking.residentName ||
    (typeof booking.userId === 'object' && booking.userId
      ? booking.userId.name || booking.userId.username
      : '') ||
    (booking as any).userName ||
    'Community Resident';

  const villaNum =
    (booking as any).villaNumber ||
    (booking as any).flatNumber ||
    (typeof booking.userId === 'object' && booking.userId
      ? booking.userId.villaNumber || booking.userId.flatNumber || booking.userId.unit
      : '') ||
    'Unit --';

  const timeSlot =
    booking.startTime && booking.endTime
      ? formatTimeRange12Hour(booking.startTime, booking.endTime)
      : booking.startTime || booking.endTime
      ? formatTimeRange12Hour(booking.startTime || booking.endTime)
      : 'All Day';

  // Status mapping
  const getStatus = (): { label: string; variant: StatusVariant } => {
    if (isConflicted) {
      return { label: 'CONFLICT', variant: 'danger' };
    }
    if (isMaintenance) {
      return { label: 'MAINTENANCE', variant: 'warning' };
    }
    const s = String(booking.status || 'CONFIRMED').toUpperCase();
    switch (s) {
      case 'CHECKED_IN':
        return { label: 'CHECKED IN', variant: 'info' };
      case 'COMPLETED':
        return { label: 'COMPLETED', variant: 'neutral' };
      case 'CANCELLED':
      case 'REJECTED':
        return { label: 'CANCELLED', variant: 'danger' };
      case 'PENDING':
        return { label: 'PENDING', variant: 'warning' };
      default:
        return { label: 'CONFIRMED', variant: 'success' };
    }
  };

  // Payment status mapping
  const getPaymentStatus = (): { label: string; variant: StatusVariant } | null => {
    if (isMaintenance) return null;
    const p = String(booking.paymentStatus || 'PAID').toUpperCase();
    switch (p) {
      case 'PARTIALLY_PAID':
        return { label: 'Partially Paid', variant: 'warning' };
      case 'PENDING':
        return { label: 'Pending', variant: 'warning' };
      case 'NOT_REQUIRED':
      case 'NOT_APPLICABLE':
        return { label: 'Not Required', variant: 'neutral' };
      case 'REFUNDED':
        return { label: 'Refunded', variant: 'info' };
      case 'FAILED':
        return { label: 'Failed', variant: 'danger' };
      default:
        return { label: 'Paid', variant: 'success' };
    }
  };

  const status = getStatus();
  const paymentStatus = getPaymentStatus();

  const title = resourceName ? `${facilityName} • ${resourceName}` : facilityName;
  const subtitle = isMaintenance
    ? `${timeSlot} • ${booking.subtitle || 'Maintenance Closure'}`
    : `${timeSlot} • ${residentName} (${villaNum})`;

  const refId =
    booking.reservationNumber ||
    booking.bookingId ||
    (booking._id ? booking._id.slice(-6).toUpperCase() : '------');

  return (
    <ListCard
      title={title}
      subtitle={subtitle}
      leftIcon={isConflicted ? 'AlertTriangle' : isMaintenance ? 'Wrench' : 'CalendarCheck'}
      leftIconBgColor={
        isConflicted
          ? 'rgba(239, 68, 68, 0.12)'
          : isMaintenance
          ? 'rgba(245, 158, 11, 0.12)'
          : 'rgba(59, 130, 246, 0.12)'
      }
      leftIconColor={isConflicted ? '#ef4444' : isMaintenance ? '#d97706' : '#2563eb'}
      status={{ label: status.label, variant: status.variant }}
      secondaryBadge={paymentStatus ? { label: paymentStatus.label, variant: paymentStatus.variant } : undefined}
      onPress={() => onPress(booking)}
      className={className || 'mb-2.5'}
    >
      <View className="flex-row items-center justify-between pt-2 border-t border-border/40 mt-1">
        <Text className="text-xs text-muted-foreground font-mono">
          Ref: #{refId}
        </Text>
        {!isMaintenance && (
          <Text className="text-xs text-muted-foreground">
            {booking.numberOfPersons || booking.guestsCount || 1} Person(s)
          </Text>
        )}
      </View>
    </ListCard>
  );
}

export default AdminReservationCard;
