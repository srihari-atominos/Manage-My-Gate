import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { QRCodeView } from '@/components/ui/QRCodeView';
import { AmenityBooking } from '../store/amenityBookingSlice';

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

  const qrString = booking.qrCode || booking.passCode || booking.bookingId || (booking._id ? String(booking._id) : 'PASS');

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Digital Access Pass">
      <View className="py-1 items-center">
        {/* Canonical Vector SVG QR Code Presentation */}
        <QRCodeView
          value={qrString}
          size={160}
          caption="Present QR Code at Gate Scanner"
        />

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
