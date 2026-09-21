import React from 'react';
import { View, Share } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { QRCodeView } from '@/components/ui/QRCodeView';
import { AmenityBooking } from '../store/amenityBookingSlice';
import { formatTimeRange12Hour } from '../utils/amenityStateHelpers';
import { encodeAppBarcode } from '@/src/utils/appBarcodeProtocol';
import { Share2 } from 'lucide-react-native';

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

  const qrString = booking.qrCode || booking.passCode || encodeAppBarcode('AMENITY', booking.bookingId || (booking._id ? String(booking._id) : 'PASS'), booking._id ? String(booking._id) : undefined);

  const handleSharePass = async () => {
    try {
      const timeStr = booking.startTime && booking.endTime ? `${booking.startTime} - ${booking.endTime}` : booking.startTime || 'Full Day';
      const msg = `Gate Access Pass for ${amenityName}\nBooking Code: ${bookingIdDisplay}\nDate: ${booking.date || booking.bookingDate || ''}\nTime: ${timeStr}\nPresent this code or QR at entry gate.`;
      await Share.share({
        title: `Access Pass - ${amenityName}`,
        message: msg,
      });
    } catch (err) {
      console.warn('Error sharing pass:', err);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Digital Access Pass">
      <View className="py-1 items-center">
        {/* Canonical Vector SVG QR Code Presentation */}
        <QRCodeView
          value={qrString}
          size={160}
          caption="Present QR Code at Gate Scanner"
        />

        {/* Action Row: Share Pass */}
        <View className="w-full my-2.5 items-center">
          <Button
            variant="outline"
            size="sm"
            onPress={handleSharePass}
            className="flex-row items-center gap-1.5 h-9 px-4 rounded-full border-primary/40 bg-primary/5 active:bg-primary/10">
            <Share2 size={14} className="text-primary" />
            <Text className="text-xs font-bold text-primary">Share Gate Pass</Text>
          </Button>
        </View>

        {/* Complete Pass Detail Rows */}
        <View className="w-full bg-muted/20 p-3.5 rounded-2xl border border-border/40 mb-4">
          <DetailRow label="Facility" value={amenityName} iconName="Building2" />
          <DetailRow label="Location" value={amenityLocation} iconName="MapPin" />
          <DetailRow label="Booking Code" value={bookingIdDisplay} copyable={true} iconName="Hash" />
          <DetailRow label="Reservation Date" value={booking.date || booking.bookingDate || ''} iconName="Calendar" />
          <DetailRow
            label="Time Window"
            value={
              booking.startTime && booking.endTime
                ? formatTimeRange12Hour(booking.startTime, booking.endTime)
                : booking.startTime || booking.endTime
                ? formatTimeRange12Hour(booking.startTime || booking.endTime)
                : 'Full Day'
            }
            iconName="Clock"
          />
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
