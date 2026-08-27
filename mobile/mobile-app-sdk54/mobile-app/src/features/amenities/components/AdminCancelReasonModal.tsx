import React, { useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
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

        <View className="mb-4">
          <Text className="text-xs font-semibold text-foreground mb-1.5">
            Cancellation Reason (Optional)
          </Text>
          <View className="bg-muted rounded-xl p-3 border border-border">
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Enter reason for cancellation (e.g. Weather, Emergency maintenance, Resident request)..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className={`text-sm text-foreground p-0 min-h-[70px] ${
                Platform.OS === 'web' ? 'outline-none' : ''
              }`}
            />
          </View>
        </View>

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
            variant="default"
            disabled={loading}
            onPress={handleConfirm}
            className="flex-1 bg-red-600 active:bg-red-700"
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
