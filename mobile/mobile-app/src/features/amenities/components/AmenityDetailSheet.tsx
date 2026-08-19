import React from 'react';
import { View, ScrollView, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Amenity } from '../store/amenitySlice';

export interface AmenityDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  amenity: Amenity | null;
  onEditClick?: (amenity: Amenity) => void;
}

const DAYS_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AmenityDetailSheet({
  visible,
  onClose,
  amenity,
  onEditClick,
}: AmenityDetailSheetProps) {
  if (!visible || !amenity) return null;

  const category = amenity.category || amenity.type || 'General';
  const pricingType = amenity.pricing?.pricingType || 'hourly';
  const baseRate = amenity.pricing?.baseRate ?? amenity.bookingFee ?? 0;
  const securityDeposit = amenity.pricing?.securityDeposit ?? 0;
  const securityDepositDescription = amenity.pricing?.securityDepositDescription || '';
  const slotDuration = amenity.bookingRules?.slotDurationMinutes ?? 60;
  const advanceDays = amenity.bookingRules?.advanceBookingDays ?? 7;
  const maxPerUser = (amenity as any).maxBookingsPerUserPerSlot ?? 1;
  const openDays: number[] = (amenity as any).openDays || [0, 1, 2, 3, 4, 5, 6];
  const isCancellationEnabled = amenity.bookingRules?.isCancellationEnabled ?? false;
  const refundRules = amenity.bookingRules?.cancellationRefundRules || [];
  const imageUrl = amenity.imageUrl || (Array.isArray(amenity.images) && amenity.images.length > 0 ? amenity.images[0] : '');

  const statusVariantMap: Record<string, StatusVariant> = {
    ACTIVE: 'success',
    MAINTENANCE: 'warning',
    INACTIVE: 'neutral',
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Facility Master Specifications">
      <ScrollView className="max-h-[80vh] py-1" showsVerticalScrollIndicator={false}>
        {/* Amenity Cover Image Banner */}
        {imageUrl ? (
          <View className="h-44 w-full rounded-2xl overflow-hidden mb-3 border border-border">
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          </View>
        ) : null}

        <View className="flex-row items-center justify-between mb-3 bg-card p-3 rounded-xl border border-border">
          <View className="flex-1 mr-2">
            <Text className="text-base font-bold text-foreground">{amenity.name}</Text>
            <Text variant="muted" className="text-xs text-muted-foreground">
              {category} • {amenity.location || 'Community Zone'}
            </Text>
          </View>
          <StatusBadge
            label={amenity.status || 'ACTIVE'}
            variant={statusVariantMap[amenity.status || 'ACTIVE'] || 'neutral'}
          />
        </View>

        {/* Master Specifications Details */}
        <View className="bg-muted/20 p-3.5 rounded-2xl border border-border/40 mb-4">
          <DetailRow label="Facility ID" value={amenity._id} copyable={true} iconName="Hash" />
          <DetailRow
            label="Pricing Rate"
            value={`₹${baseRate} / ${pricingType === 'daily' ? 'day' : 'slot'}`}
            iconName="DollarSign"
          />
          <DetailRow
            label="Security Deposit"
            value={securityDeposit ? `₹${securityDeposit} (${securityDepositDescription || 'Refundable'})` : 'None'}
            iconName="Shield"
          />
          <DetailRow label="Max Capacity" value={`${amenity.capacity || 20} Persons`} iconName="Users" />
          <DetailRow
            label="Operating Hours"
            value={`${amenity.bookingRules?.openTime || amenity.openTime || '08:00'} - ${amenity.bookingRules?.closeTime || amenity.closeTime || '21:00'}`}
            iconName="Clock"
          />
          <DetailRow
            label="Slot Duration"
            value={pricingType === 'daily' ? 'Full Day' : `${slotDuration} Minutes`}
            iconName="Timer"
          />
          <DetailRow
            label="Advance Booking Limit"
            value={`${advanceDays} Days in Advance`}
            iconName="Calendar"
          />
          <DetailRow
            label="Max Per Resident / Slot"
            value={`${maxPerUser} Reservation(s)`}
            iconName="UserCheck"
          />

          {/* Operating Days */}
          <View className="py-2 border-b border-border/40">
            <Text className="text-xs text-muted-foreground mb-1 font-medium">Operating Days</Text>
            <View className="flex-row flex-wrap gap-1">
              {DAYS_NAMES.map((dayName, idx) => {
                const isOpen = openDays.includes(idx);
                return (
                  <View
                    key={dayName}
                    className={`px-2 py-0.5 rounded-md text-[10px] ${
                      isOpen ? 'bg-primary/10 border border-primary/30' : 'bg-muted/40 border border-border/40'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        isOpen ? 'text-primary' : 'text-muted-foreground line-through'
                      }`}
                    >
                      {dayName}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Cancellation Policy Details */}
          <View className="py-2">
            <Text className="text-xs text-muted-foreground mb-1 font-medium">Cancellation & Refund Policy</Text>
            {isCancellationEnabled ? (
              refundRules.length > 0 ? (
                refundRules.map((rule: { cancelBeforeHours: number; refundPercentage: number }, i: number) => (
                  <Text key={i} className="text-xs font-semibold text-foreground">
                    • Cancel ≥ {rule.cancelBeforeHours}h before: {rule.refundPercentage}% refund
                  </Text>
                ))
              ) : (
                <Text className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Cancellation enabled (100% loss - no rules set)
                </Text>
              )
            ) : (
              <Text className="text-xs text-red-500 font-medium">Cancellation Disabled (No Refunds)</Text>
            )}
          </View>

          {amenity.description ? (
            <DetailRow
              label="House Rules & Description"
              value={amenity.description}
              iconName="FileText"
              isLast={true}
            />
          ) : null}
        </View>

        {/* Action CTAs */}
        <View className="flex-row gap-3 mt-1 mb-2">
          {onEditClick ? (
            <Button
              variant="outline"
              onPress={() => {
                onClose();
                onEditClick(amenity);
              }}
              className="flex-1 bg-primary/10 border-primary/20"
            >
              <Text className="text-primary font-bold text-sm">Edit Specifications</Text>
            </Button>
          ) : null}
          <Button variant="default" onPress={onClose} className="flex-1 bg-primary">
            <Text className="text-white font-bold text-sm">Close</Text>
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

export default AmenityDetailSheet;
