import React from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { AlertTriangle, CalendarCheck, RotateCcw } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { AmenityFacility } from '../types/amenityDomain.types';

export interface AmenityDeactivationConflictModalProps {
  visible: boolean;
  facility: AmenityFacility | null;
  bookingsCount: number;
  loading?: boolean;
  onHonorExisting: () => void;
  onCancelAndRefund: () => void;
  onDismiss: () => void;
}

export const AmenityDeactivationConflictModal: React.FC<AmenityDeactivationConflictModalProps> = ({
  visible,
  facility,
  bookingsCount,
  loading = false,
  onHonorExisting,
  onCancelAndRefund,
  onDismiss,
}) => {
  if (!visible || !facility) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onDismiss}
    >
      <View className="flex-1 justify-center items-center bg-black/60 p-4">
        <View
          className={cn(
            'bg-card rounded-3xl p-6 mx-4 w-full max-w-md shadow-2xl border border-border/80',
            Platform.select({
              web: 'transition-all duration-200',
            })
          )}
        >
          {/* Header Warning Icon */}
          <View className="w-14 h-14 rounded-full items-center justify-center self-center bg-amber-500/10 border border-amber-500/20">
            <Icon as={AlertTriangle} size={28} className="text-amber-600 dark:text-amber-400" />
          </View>

          {/* Title & Description */}
          <Text className="text-center mt-4 text-[18px] font-bold font-sans text-foreground">
            Active Bookings Conflict
          </Text>

          <Text variant="muted" className="text-center mt-2 text-[14px] font-sans text-muted-foreground leading-5">
            <Text className="font-semibold text-foreground">"{facility.name}"</Text> has{' '}
            <Text className="font-bold text-amber-600 dark:text-amber-400">
              {bookingsCount || 1} upcoming confirmed booking{bookingsCount === 1 ? '' : 's'}
            </Text>
            . How would you like to handle existing reservations upon deactivation?
          </Text>

          {/* Options Container */}
          <View className="mt-5 gap-3">
            {/* Option 1: Honor Existing */}
            <Pressable
              disabled={loading}
              onPress={onHonorExisting}
              className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 active:bg-blue-500/10"
            >
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-xl items-center justify-center bg-blue-500/10 border border-blue-500/20 me-3 mt-0.5">
                  <Icon as={CalendarCheck} size={20} className="text-blue-600 dark:text-blue-400" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-foreground text-[15px]">
                    Honor Existing Bookings
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-1 leading-4">
                    Deactivate facility for new bookings, but permit all scheduled reservations to proceed normally.
                  </Text>
                </View>
              </View>
              <Button
                variant="default"
                size="sm"
                disabled={loading}
                loading={loading}
                onPress={onHonorExisting}
                className="mt-3 bg-blue-600 active:bg-blue-700"
              >
                <Text className="text-white font-semibold text-xs">Honor & Deactivate</Text>
              </Button>
            </Pressable>

            {/* Option 2: Cancel & Refund All */}
            <Pressable
              disabled={loading}
              onPress={onCancelAndRefund}
              className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 active:bg-rose-500/10"
            >
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-xl items-center justify-center bg-rose-500/10 border border-rose-500/20 me-3 mt-0.5">
                  <Icon as={RotateCcw} size={20} className="text-rose-600 dark:text-rose-400" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-destructive text-[15px]">
                    Cancel & Refund All
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-1 leading-4">
                    Instantly cancel all upcoming bookings and process a 100% full refund to residents.
                  </Text>
                </View>
              </View>
              <Button
                variant="destructive"
                size="sm"
                disabled={loading}
                loading={loading}
                onPress={onCancelAndRefund}
                className="mt-3 bg-rose-600 active:bg-rose-700"
              >
                <Text className="text-white font-semibold text-xs">Cancel, Refund & Deactivate</Text>
              </Button>
            </Pressable>
          </View>

          {/* Dismiss / Cancel Button */}
          <Button
            variant="outline"
            disabled={loading}
            onPress={onDismiss}
            className="mt-4 border-border active:bg-secondary/60"
          >
            <Text className="text-foreground font-medium text-sm">Keep Facility Active (Cancel)</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default AmenityDeactivationConflictModal;
