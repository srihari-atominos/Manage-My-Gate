import React from 'react';
import { Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, ArrowRight } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export interface StickyBottomCTAProps {
  pricePerHour: number;
  selectedSlotsCount: number;
  onReserve: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const StickyBottomCTA: React.FC<StickyBottomCTAProps> = ({
  pricePerHour,
  selectedSlotsCount,
  onReserve,
  isLoading = false,
  disabled = false,
  className,
}) => {
  const insets = useSafeAreaInsets();
  const totalPrice = selectedSlotsCount * pricePerHour;

  return (
    <View
      className={cn(
        'absolute bottom-0 left-0 right-0 border-t border-border bg-card/95 px-5 pt-3 backdrop-blur-lg shadow-lg',
        className
      )}
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View className="flex-row items-center justify-between">
        {/* Pricing Summary Column */}
        <View className="flex-1 me-4">
          <Text className="text-[11px] font-medium text-muted-foreground">
            {selectedSlotsCount > 0
              ? `${selectedSlotsCount} slot${selectedSlotsCount > 1 ? 's' : ''} selected`
              : 'Base Rate'}
          </Text>

          <View className="flex-row items-baseline">
            <Text className="text-2xl font-black text-foreground">
              ₹{selectedSlotsCount > 0 ? totalPrice : pricePerHour}
            </Text>
            <Text className="text-xs text-muted-foreground ms-1">
              {selectedSlotsCount > 0 ? ' total' : ' / hour'}
            </Text>
          </View>
        </View>

        {/* CTA Primary Action Button */}
        <TouchableOpacity
          onPress={onReserve}
          disabled={disabled || isLoading || selectedSlotsCount === 0}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Reserve Selected Time Slot"
          accessibilityState={{ disabled: disabled || selectedSlotsCount === 0 }}
          className={cn(
            'min-h-[52px] min-w-[170px] flex-row items-center justify-center rounded-2xl px-6 shadow-md transition-all',
            selectedSlotsCount > 0 && !disabled
              ? 'bg-primary active:scale-[0.98]'
              : 'bg-muted border border-border opacity-70'
          )}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <CalendarCheck
                size={18}
                className={cn('me-2', selectedSlotsCount > 0 ? 'text-primary-foreground' : 'text-muted-foreground')}
                color={selectedSlotsCount > 0 ? '#ffffff' : '#64748b'}
              />
              <Text
                className={cn(
                  'text-sm font-bold',
                  selectedSlotsCount > 0 ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                {selectedSlotsCount > 0 ? 'Reserve Slot' : 'Select Slot'}
              </Text>
              {selectedSlotsCount > 0 && (
                <ArrowRight size={16} color="#ffffff" className="ms-1.5" />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
