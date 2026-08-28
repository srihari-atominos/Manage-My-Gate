import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { AmenityBooking } from '../store/amenityBookingSlice';

interface CancelBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  booking: AmenityBooking | null;
  loading?: boolean;
}

export function CancelBookingModal({
  visible,
  onClose,
  onConfirm,
  booking,
  loading = false,
}: CancelBookingModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation.');
      return;
    }
    setError('');
    onConfirm(reason);
  };

  const handleClose = () => {
    if (loading) return;
    setReason('');
    setError('');
    onClose();
  };

  if (!booking) return null;

  const amenityName =
    typeof booking.amenityId === 'object' && booking.amenityId
      ? booking.amenityId.name
      : booking.amenityName || 'this facility';

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Cancel Booking">
      <View className="px-4 pb-8">
        <Text variant="muted" className="mb-4">
          {`Are you sure you want to cancel your reservation for ${amenityName} on ${booking.date}?`}
        </Text>

        <TextInput
          label="Cancellation Reason"
          placeholder="E.g., Change of plans, illness..."
          value={reason}
          onChangeText={(val) => {
            setReason(val);
            if (error) setError('');
          }}
          multiline
          numberOfLines={3}
          error={error}
          containerClassName="mb-6"
        />

        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={handleClose}
            disabled={loading}
          >
            <Text>Keep Booking</Text>
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onPress={handleConfirm}
            disabled={loading}
          >
            <Text>{loading ? 'Cancelling...' : 'Cancel Booking'}</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}
