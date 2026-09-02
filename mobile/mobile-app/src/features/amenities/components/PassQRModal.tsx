import React from 'react';
import { View, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { AmenityBooking } from '../store/amenityBookingSlice';
import { encodeAppBarcode } from '@/src/utils/appBarcodeProtocol';

export interface PassQRModalProps {
  visible: boolean;
  onClose: () => void;
  booking: AmenityBooking | null;
}

export function PassQRModal({ visible, onClose, booking }: PassQRModalProps) {
  if (!visible || !booking) return null;

  const amenityName =
    typeof booking.amenityId === 'object' && booking.amenityId
      ? booking.amenityId.name
      : booking.amenityName || 'Amenity Pass';

  const amenityLocation =
    typeof booking.amenityId === 'object' && booking.amenityId
      ? booking.amenityId.location || 'Community Facilities'
      : booking.amenityLocation || 'Community Facilities';

  const statusVariantMap: Record<string, StatusVariant> = {
    CONFIRMED: 'success',
    PENDING: 'warning',
    CHECKED_IN: 'info',
    COMPLETED: 'neutral',
    CANCELLED: 'danger',
  };

  const badgeVariant = statusVariantMap[booking.status] || 'neutral';
  const bookingIdDisplay = booking.bookingId || (booking._id ? String(booking._id).substring(0, 8).toUpperCase() : 'PASS');

  const rawBookingCode = booking.bookingId || (booking._id ? String(booking._id) : 'PASS');
  const qrString = encodeAppBarcode('AMENITY', rawBookingCode, booking._id ? String(booking._id) : undefined);
  const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(qrString)}`;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Digital Access Pass">
      <View className="py-1 items-center">
        {/* Pass QR Visual Frame */}
        <View className="my-2 p-3 bg-white rounded-2xl border-2 border-primary/20 items-center justify-center shadow-md w-44 h-44">
          <Image
            source={{ uri: qrUri }}
            style={{ width: 140, height: 140 }}
            resizeMode="contain"
          />
        </View>
        <Text className="text-[11px] text-muted-foreground mb-2 text-center font-semibold">
          Present QR Code at Gate Scanner
        </Text>

        {/* Complete Pass Detail Rows */}
        <View className="w-full bg-muted/20 p-3.5 rounded-2xl border border-border/40 mb-4">
          <DetailRow label="Facility" value={amenityName} iconName="Building2" />
          <DetailRow label="Location" value={amenityLocation} iconName="MapPin" />
          <DetailRow label="Booking Code" value={bookingIdDisplay} copyable={true} iconName="Hash" />
          <DetailRow label="Reservation Date" value={booking.date || booking.bookingDate || ''} iconName="Calendar" />
          <DetailRow label="Time Window" value={`${booking.startTime} - ${booking.endTime}`} iconName="Clock" />
          <DetailRow label="Attendees" value={`${booking.numberOfPersons || booking.guestsCount || 1} Person(s)`} iconName="Users" />
          <DetailRow label="Total Amount" value={booking.totalFee ? `₹${booking.totalFee.toFixed(2)}` : 'Free'} iconName="CreditCard" />
          <DetailRow label="Payment Method" value={booking.paymentMethod || 'None'} iconName="Wallet" />
          <DetailRow
            label="Pass Status"
            value={<StatusBadge label={booking.status} variant={badgeVariant} size="sm" />}
            isLast={true}
          />
        </View>

        <Button variant="outline" onPress={onClose} className="w-full">
          <Text className="font-semibold text-sm">Close Pass</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}

export default PassQRModal;
