import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/ui/button';
import { AmenityBooking } from '../store/amenityBookingSlice';

export interface AdminCancelReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  booking: AmenityBooking | null;
  loading?: boolean;
}

export function AdminCancelReasonModal({
  visible,
  onClose,
  onConfirm,
  booking,
  loading = false,
}: AdminCancelReasonModalProps) {
  const [reason, setReason] = useState<string>('');

  if (!visible || !booking) return null;

  const amenityName =
    typeof booking.amenityId === 'object' && booking.amenityId
      ? booking.amenityId.name
      : booking.amenityName || 'Amenity Slot';

  const handleConfirm = () => {
    onConfirm(reason.trim() || 'Admin Cancellation');
    setReason('');
  };

  const handleModalClose = () => {
    setReason('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleModalClose} title="Cancel Reservation">
      <View className="py-2">
        <Text className="text-sm font-semibold text-foreground mb-1">
          Canceling Reservation for {amenityName}
        </Text>
        <Text variant="muted" className="text-xs text-muted-foreground mb-4">
          Date: {booking.date} ({booking.startTime} - {booking.endTime})
        </Text>

        <TextInput
          label="Cancellation Reason (Optional)"
          value={reason}
          onChangeText={setReason}
          placeholder="Enter reason for cancellation (e.g. Weather, Emergency maintenance, Resident request)..."
          multiline
          numberOfLines={3}
          containerClassName="mb-4"
        />

        <View className="flex-row gap-3 mt-2">
          <Button
            variant="outline"
            disabled={loading}
            onPress={handleModalClose}
            className="flex-1"
          >
            <Text className="font-semibold text-sm">Keep Booking</Text>
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onPress={handleConfirm}
            className="flex-1"
          >
            <Text className="text-white font-bold text-sm">
              {loading ? 'Canceling...' : 'Confirm Cancel'}
            </Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default AdminCancelReasonModal;
