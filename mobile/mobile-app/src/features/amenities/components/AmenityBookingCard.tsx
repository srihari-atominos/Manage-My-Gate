import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AmenityBooking } from '../store/amenityBookingSlice';

export interface AmenityBookingCardProps {
  booking: AmenityBooking;
  onPress: (booking: AmenityBooking) => void;
  onViewPassQR: (booking: AmenityBooking) => void;
  onCancelPress?: (booking: AmenityBooking) => void;
}

/**
 * AmenityBookingCard Component
 * Canonical ListCard implementation for Amenity Bookings & Digital Passes.
 * Directly wraps ListCard with composite metadata and reservation action rows in the children slot.
 */
export function AmenityBookingCard({
  booking,
  onPress,
  onViewPassQR,
  onCancelPress,
}: AmenityBookingCardProps) {
  const amenityObj = typeof booking.amenityId === 'object' && booking.amenityId ? booking.amenityId : null;
  const amenityName = amenityObj?.name || booking.amenityName || 'Amenity Pass';
  const coverImage = amenityObj?.images?.[0];
  const isCancelable = booking.status === 'CONFIRMED' || booking.status === 'PENDING';
  const bookingIdDisplay = booking.bookingId || (booking._id ? String(booking._id).substring(0, 8).toUpperCase() : 'PASS');

  const getEntryStatus = (item: AmenityBooking): { label: string; variant: StatusVariant } => {
    const s = (item?.status || '').toLowerCase();
    const q = (item?.qrStatus || '').toLowerCase();

    if (q === 'expired') return { label: 'Expired', variant: 'danger' };
    switch (s) {
      case 'checked_in':
      case 'checked-in':
        return { label: 'Entered', variant: 'info' };
      case 'completed':
        return { label: 'Completed', variant: 'neutral' };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'danger' };
      default:
        return { label: 'Not Entered', variant: 'warning' };
    }
  };

  const getPaymentStatus = (item: AmenityBooking): { label: string; variant: StatusVariant } => {
    const s = (item.paymentStatus || '').toLowerCase();
    const bs = (item.status || '').toLowerCase();

    if (['success', 'completed', 'paid'].includes(s)) return { label: 'Paid', variant: 'success' };
    if (s === 'failed') return { label: 'Failed', variant: 'danger' };
    if (s === 'refunded') return { label: 'Refunded', variant: 'info' };
    if (s === 'partial_refund') return { label: 'Partial Refund', variant: 'info' };

    if (bs === 'confirmed') return { label: 'Paid', variant: 'success' };
    if (bs === 'cancelled') return { label: 'Refunded', variant: 'info' };

    return { label: 'Paid', variant: 'success' };
  };

  const getQrStatus = (item: AmenityBooking): { label: string; variant: StatusVariant } => {
    const s = (item?.status || '').toLowerCase();
    const q = (item?.qrStatus || '').toLowerCase();

    if (s === 'cancelled') return { label: 'Revoked', variant: 'danger' };
    switch (q) {
      case 'active':
        return { label: 'Active', variant: 'success' };
      case 'expired':
        return { label: 'Expired', variant: 'danger' };
      case 'revoked':
        return { label: 'Revoked', variant: 'danger' };
      default:
        return { label: item.qrStatus || 'N/A', variant: 'neutral' };
    }
  };

  const getBookingStatusVariant = (status: string): StatusVariant => {
    switch (status) {
      case 'CONFIRMED': return 'success';
      case 'CHECKED_IN': return 'info';
      case 'CANCELLED': return 'danger';
      case 'PENDING': return 'warning';
      default: return 'neutral';
    }
  };

  const entryStatus = getEntryStatus(booking);
  const paymentStatus = getPaymentStatus(booking);
  const qrStatus = getQrStatus(booking);

  const timeWindowSubtitle = [
    booking?.date,
    booking?.startTime && booking?.endTime
      ? `${booking.startTime} - ${booking.endTime}`
      : booking?.startTime || booking?.endTime || '',
  ].filter(Boolean).join(' • ');

  return (
    <ListCard
      title={amenityName}
      subtitle={timeWindowSubtitle || 'Amenity Reservation'}
      leftImage={coverImage || undefined}
      leftIcon={!coverImage ? 'CalendarCheck' : undefined}
      onPress={() => onPress(booking)}
      status={{
        label: booking.status,
        variant: getBookingStatusVariant(booking.status),
      }}
      secondaryBadge={paymentStatus}
    >
      {/* Compact Details & Multi-state Pill Strip */}
      <View className="pt-2 border-t border-border/40 flex-col gap-2">
        <View className="flex-row justify-between items-center">
          <Text variant="muted" className="text-xs font-medium">
            Booking ID: <Text className="font-bold text-foreground text-xs">{bookingIdDisplay}</Text>
          </Text>
          <Text variant="muted" className="text-xs font-medium">
            Guests: <Text className="font-semibold text-foreground text-xs">{booking.numberOfPersons || booking.guestsCount || 1} Person(s)</Text>
          </Text>
        </View>
        <View className="flex-row justify-between items-center pt-1.5 border-t border-border/20">
          <View className="flex-row items-center gap-1.5">
            <Text variant="muted" className="text-xs">Entry:</Text>
            <StatusBadge label={entryStatus.label} variant={entryStatus.variant} size="sm" />
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text variant="muted" className="text-xs">Pass QR:</Text>
            <StatusBadge label={qrStatus.label} variant={qrStatus.variant} size="sm" />
          </View>
        </View>
      </View>

      {/* Action CTA Row */}
      {isCancelable && (
        <View className="flex-row justify-between items-center pt-2 mt-1 border-t border-border/30">
          <Button
            variant="outline"
            size="sm"
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onViewPassQR(booking);
            }}
            className="h-8 px-3 rounded-lg border-blue-500/30 bg-blue-500/10 active:bg-blue-500/20"
            accessibilityRole="button"
            accessibilityLabel="View digital pass QR"
          >
            <Text className="text-blue-600 dark:text-blue-400 text-xs font-semibold">View Pass QR</Text>
          </Button>
          {onCancelPress && (
            <Button
              variant="outline"
              size="sm"
              onPress={(e: any) => {
                e?.stopPropagation?.();
                onCancelPress(booking);
              }}
              className="h-8 px-3 rounded-lg border-border active:bg-secondary/60"
              accessibilityRole="button"
              accessibilityLabel="Cancel booking"
            >
              <Text className="text-muted-foreground text-xs font-semibold">
                Cancel Booking
              </Text>
            </Button>
          )}
        </View>
      )}
    </ListCard>
  );
}

export default AmenityBookingCard;
