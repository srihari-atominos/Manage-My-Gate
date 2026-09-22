import React from 'react';
import { View, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { AmenityFacility } from '../types/amenityDomain.types';
import {
  getArchetypeMeta,
  getFacilityStatusMeta,
  formatFacilityPricing,
  formatFacilityOperatingHours,
} from '../utils/amenityPresentation';
import { Sparkles, Users, Timer, DoorOpen, Wrench } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';

export interface AmenityDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  amenity: AmenityFacility | any | null;
  onEditClick?: (amenity: AmenityFacility) => void;
  onScheduleMaintenanceClick?: (amenity: AmenityFacility) => void;
}

const DAYS_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AmenityDetailSheet({
  visible,
  onClose,
  amenity,
  onEditClick,
  onScheduleMaintenanceClick,
}: AmenityDetailSheetProps) {
  const { t, translateText } = useTranslation();
  if (!visible || !amenity) return null;

  const archetypeMeta = getArchetypeMeta(amenity.archetype || amenity.type || amenity.category);
  const statusMeta = getFacilityStatusMeta(amenity.status);

  const pricingInfo = formatFacilityPricing(
    amenity.pricingConfig || {
      type: amenity.bookingFee ? 'HOURLY' : 'FREE',
      baseRate: amenity.bookingFee || 0,
      depositAmount: amenity.securityDeposit || 0,
      currency: 'INR',
    }
  );

  const securityDeposit =
    amenity.pricingConfig?.depositAmount ??
    amenity.pricingConfig?.securityDeposit ??
    amenity.securityDeposit ??
    0;

  const slotDuration = amenity.slotDurationMinutes || amenity.bookingRules?.slotDurationMinutes || 60;
  const setupBuffer = amenity.setupBufferMinutes || amenity.bookingRules?.bufferTimeMinutes || 0;
  const advanceDays =
    amenity.bookingRules?.maxAdvanceBookingDays || amenity.bookingRules?.advanceBookingDays || 7;
  const minNoticeHours = amenity.bookingRules?.minNoticeHours || 0;
  const maxHeadcount =
    amenity.maxHeadcountPerReservation || amenity.maxBookingsPerUserPerSlot || 1;
  const capacity = amenity.maxCapacity || amenity.capacity || 1;

  const openDays: number[] =
    amenity.openDays ||
    (Array.isArray(amenity.operatingHours) && amenity.operatingHours.length > 0
      ? amenity.operatingHours.map((oh: any) => oh.dayOfWeek)
      : [0, 1, 2, 3, 4, 5, 6]);

  const requiresApproval =
    Boolean(amenity.requiresApproval) || Boolean(amenity.bookingRules?.requiresApproval);

  const isCancellationEnabled =
    amenity.bookingRules?.isCancellationEnabled ??
    amenity.cancellationPolicy?.allowCancellation ??
    amenity.cancellationPolicy?.isAllowed ??
    false;

  const refundRules =
    amenity.bookingRules?.cancellationRefundRules ||
    (amenity.cancellationPolicy?.cancellationFeePercentage !== undefined
      ? [
          {
            cancelBeforeHours: amenity.cancellationPolicy.freeCancellationHours || 24,
            refundPercentage: 100 - (amenity.cancellationPolicy.cancellationFeePercentage || 0),
          },
        ]
      : []);

  const imageUrl =
    amenity.imageUrl ||
    (Array.isArray(amenity.images) && amenity.images.length > 0 ? amenity.images[0] : '');

  const formattedHours = formatFacilityOperatingHours(
    amenity.operatingHours,
    amenity.timezone || 'UTC'
  );

  const renderArchetypeIcon = () => {
    switch (archetypeMeta.archetype) {
      case 'EXCLUSIVE_HOURLY':
        return <Timer size={12} color="#6366f1" />;
      case 'EVENT_SPACE':
        return <Sparkles size={12} color="#f59e0b" />;
      case 'ROOM_RESOURCE':
        return <DoorOpen size={12} color="#a855f7" />;
      case 'INVENTORY_TOOLS':
        return <Wrench size={12} color="#10b981" />;
      default:
        return <Users size={12} color="#3b82f6" />;
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('facility_master_specifications', 'Facility Master Specifications')}>
      <View className="py-1">
        {/* Amenity Cover Image Banner */}
        {imageUrl ? (
          <View className="h-44 w-full rounded-2xl overflow-hidden mb-3 border border-border">
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          </View>
        ) : null}

        {/* Header Summary Pill */}
        <View className="flex-row items-center justify-between mb-3 bg-card p-3 rounded-xl border border-border">
          <View className="flex-1 me-2">
            <Text className="text-base font-bold text-foreground">{translateText(amenity.name)}</Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              {renderArchetypeIcon()}
              <Text className="text-xs font-semibold text-muted-foreground">
                {translateText(archetypeMeta.label)} • {translateText(amenity.location || 'Community Facilities')}
              </Text>
            </View>
          </View>
          <StatusBadge
            label={statusMeta.label}
            variant={statusMeta.variant}
            dot={statusMeta.pulseDot}
          />
        </View>

        {/* Master Specifications Details */}
        <View className="bg-muted/20 p-3.5 rounded-2xl border border-border/40 mb-4">
          {amenity.code ? (
            <DetailRow label="Facility Code" value={amenity.code} copyable={true} iconName="Tag" />
          ) : null}

          <DetailRow label="System ID" value={amenity._id} copyable={true} iconName="Hash" />

          <DetailRow
            label="Canonical Archetype"
            value={`${archetypeMeta.label} (${archetypeMeta.shortLabel})`}
            iconName="Layers"
          />

          <DetailRow
            label="Pricing Structure"
            value={pricingInfo.displayRate}
            iconName="DollarSign"
          />

          <DetailRow
            label="Security Deposit"
            value={securityDeposit > 0 ? `₹${securityDeposit} (Refundable)` : 'No Deposit Required'}
            iconName="Shield"
          />

          <DetailRow
            label="Capacity Limits"
            value={`Max ${capacity} Total (${maxHeadcount} per booking)`}
            iconName="Users"
          />

          <DetailRow
            label="Slot Specs"
            value={
              amenity.pricingConfig?.type === 'DAILY'
                ? 'Full Day Booking'
                : `${slotDuration} Min Slot${setupBuffer > 0 ? ` + ${setupBuffer}m Buffer` : ''}`
            }
            iconName="Timer"
          />

          <DetailRow
            label="Advance Booking"
            value={`Up to ${advanceDays} days (Min notice: ${minNoticeHours}h)`}
            iconName="Calendar"
          />

          <DetailRow
            label="Approval Workflow"
            value={requiresApproval ? 'Admin Review Required' : 'Instant Confirmation'}
            iconName="ShieldCheck"
          />

          {amenity.timezone ? (
            <DetailRow label="Facility Timezone" value={amenity.timezone} iconName="Globe" />
          ) : null}

          {/* Operating Days */}
          <View className="py-2.5 border-b border-border/40">
            <Text className="text-xs text-muted-foreground mb-1.5 font-medium">Operating Schedule</Text>
            <View className="flex-row flex-wrap gap-1 mb-2">
              {DAYS_NAMES.map((dayName, idx) => {
                const isOpen = openDays.includes(idx);
                return (
                  <View
                    key={dayName}
                    className={`px-2 py-0.5 rounded-md ${
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
            {formattedHours.slice(0, 3).map((item, idx) => (
              <Text key={idx} className="text-xs text-foreground/80 font-medium">
                • {item.day}: {item.hours}
              </Text>
            ))}
          </View>

          {/* Cancellation Policy Details */}
          <View className="py-2">
            <Text className="text-xs text-muted-foreground mb-1 font-medium">Cancellation & Refund Policy</Text>
            {isCancellationEnabled ? (
              refundRules.length > 0 ? (
                refundRules.map((rule: any, i: number) => (
                  <Text key={i} className="text-xs font-semibold text-foreground">
                    • Cancel ≥ {rule.cancelBeforeHours}h before: {rule.refundPercentage}% refund
                  </Text>
                ))
              ) : (
                <Text className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Cancellation enabled (Subject to manager approval)
                </Text>
              )
            ) : (
              <Text className="text-xs text-destructive font-medium">Cancellation Disabled (No Refunds)</Text>
            )}
          </View>

          {amenity.description ? (
            <DetailRow
              label={t('house_rules_description', 'House Rules & Description')}
              value={translateText(amenity.description)}
              iconName="FileText"
              isLast={true}
            />
          ) : null}
        </View>

        {/* Action CTAs */}
        <View className="flex-row gap-2 mt-1 mb-2">
          {onEditClick ? (
            <Button
              variant="outline"
              onPress={() => {
                onClose();
                onEditClick(amenity);
              }}
              className="flex-1 bg-primary/10 border-primary/20 h-11 rounded-xl"
            >
              <Text className="text-primary font-bold text-xs">Edit Specs</Text>
            </Button>
          ) : null}
          {onScheduleMaintenanceClick ? (
            <Button
              variant="outline"
              onPress={() => {
                onClose();
                onScheduleMaintenanceClick(amenity);
              }}
              className="flex-1 bg-amber-500/10 border-amber-500/30 h-11 rounded-xl"
            >
              <Text className="text-amber-600 dark:text-amber-400 font-bold text-xs">Schedule Upkeep</Text>
            </Button>
          ) : null}
          <Button variant="default" onPress={onClose} className="flex-1 h-11 rounded-xl">
            <Text className="text-primary-foreground font-bold text-xs">Close</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default AmenityDetailSheet;
