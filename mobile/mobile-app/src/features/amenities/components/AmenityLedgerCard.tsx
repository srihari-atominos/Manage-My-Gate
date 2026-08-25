import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { AmenityBooking } from '../store/amenityBookingSlice';

export interface AmenityLedgerCardProps {
  booking: AmenityBooking;
  onPress: () => void;
  className?: string;
}

export function AmenityLedgerCard({ booking, onPress, className }: AmenityLedgerCardProps) {
  const amenityName =
    typeof booking.amenityId === 'object' && booking.amenityId
      ? booking.amenityId.name
      : booking.amenityName || 'Amenity Facility';

  const userObj = typeof booking.userId === 'object' && booking.userId ? booking.userId : null;
  const residentName =
    booking.residentName ||
    userObj?.name ||
    userObj?.username ||
    (booking as any).userName ||
    'Resident';

  const villaNum =
    (booking as any).villaNumber ||
    (booking as any).flatNumber ||
    userObj?.villaNumber ||
    userObj?.flatNumber ||
    userObj?.unit ||
    'Villa 101';

  const bookingCode = booking.bookingId ? `#${booking.bookingId}` : `#${booking._id.slice(-6).toUpperCase()}`;
  const subtitle = `Resident: ${residentName} (${villaNum}) • ${booking.date || booking.bookingDate || 'Recent'}`;

  const isCancelled = (booking.status as string) === 'CANCELLED' || (booking.status as string) === 'REJECTED';
  const statusLabel = isCancelled ? 'CANCELLED' : booking.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED';
  const statusVariant: StatusVariant = isCancelled ? 'danger' : booking.status === 'COMPLETED' ? 'neutral' : 'success';

  const paymentStatus = booking.paymentStatus || (isCancelled ? 'REFUNDED' : 'PAID');
  const paymentVariant: StatusVariant =
    paymentStatus === 'PAID' || paymentStatus === 'COMPLETED'
      ? 'success'
      : paymentStatus === 'REFUNDED'
      ? 'neutral'
      : 'warning';

  const feeAmount = booking.totalFee ?? (booking as any).pricingDetails?.totalAmount ?? 0;
  const formattedFee = feeAmount > 0 ? `₹${feeAmount.toLocaleString('en-IN')}` : 'Free';

  // Dynamic status icon
  let leftIcon = 'Receipt';
  if (isCancelled) {
    leftIcon = 'CircleX';
  } else if (booking.status === 'COMPLETED') {
    leftIcon = 'CircleCheck';
  } else if (booking.status === 'CHECKED_IN') {
    leftIcon = 'Clock';
  }

  return (
    <ListCard
      title={`${bookingCode} • ${amenityName}`}
      subtitle={subtitle}
      leftIcon={leftIcon}
      status={{
        label: statusLabel,
        variant: statusVariant,
      }}
      timestamp={`${booking.startTime} - ${booking.endTime}`}
      onPress={onPress}
      className={className}
      rightContent={
        <View className="items-end justify-center ms-2 gap-1 shrink-0">
          <Text className="text-foreground font-bold text-base">{formattedFee}</Text>
          <StatusBadge label={paymentStatus} variant={paymentVariant} size="sm" />
        </View>
      }
    />
  );
}

export default AmenityLedgerCard;
