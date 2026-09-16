/**
 * ResidentAmenityDetailView Component
 * Authoritative presentation view for facility details, capacity, pricing config,
 * weekly operating hours (in facility IANA timezone), booking rules, associated resources,
 * maintenance alerts, and Book Now action button.
 * Consumed by both ResidentAmenityDetailSheet and the standalone detail route.
 */

import React from 'react';
import { View, Image, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  AmenityFacility,
  AmenityResource,
} from '../types/amenityDomain.types';
import {
  getArchetypeMeta,
  getFacilityStatusMeta,
  formatFacilityPricing,
  formatFacilityOperatingHours,
  isFacilityBookable,
} from '../utils/amenityPresentation';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  DollarSign,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CalendarCheck,
  Wrench,
  DoorOpen,
  Sparkles,
  Info,
} from 'lucide-react-native';

export interface ResidentAmenityDetailViewProps {
  facility: AmenityFacility | null;
  resources?: AmenityResource[];
  onBookClick?: (facilityId: string) => void;
  scrollable?: boolean;
}

export function ResidentAmenityDetailView({
  facility,
  resources = [],
  onBookClick,
  scrollable = false,
}: ResidentAmenityDetailViewProps) {
  if (!facility) {
    return (
      <View className="py-8 items-center justify-center">
        <Info size={36} className="text-muted-foreground/60 mb-2" />
        <Text className="text-sm font-semibold text-muted-foreground">
          Facility information is unavailable.
        </Text>
      </View>
    );
  }

  const archetypeMeta = getArchetypeMeta(facility.archetype);
  const statusMeta = getFacilityStatusMeta(facility.status);
  const bookableCheck = isFacilityBookable(facility);
  const pricingFormatted = formatFacilityPricing(facility.pricingConfig);
  const operatingHoursList = formatFacilityOperatingHours(
    facility.operatingHours,
    facility.timezone
  );

  const imageUrl =
    Array.isArray(facility.images) && facility.images.length > 0 ? facility.images[0] : '';
  const isMaintenance = facility.status === 'MAINTENANCE';
  const bookingRules = facility.bookingRules;

  const content = (
    <View className="py-2 pb-6">
      {/* 1. Cover Image Header */}
      {imageUrl ? (
        <View className="h-48 w-full rounded-2xl overflow-hidden mb-3 border border-border bg-muted">
          <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
        </View>
      ) : null}

      {/* 2. Facility Title & Status Card */}
      <View className="bg-card p-4 rounded-2xl border border-border/80 mb-3 shadow-xs">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 me-2">
            <Text className="text-xl font-extrabold text-foreground tracking-tight">
              {facility.name}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              <View className="bg-primary/10 px-2 py-0.5 rounded-md">
                <Text className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  {archetypeMeta.label}
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground">
                • Timezone: {facility.timezone || 'UTC'}
              </Text>
            </View>
          </View>
          <StatusBadge
            label={statusMeta.label}
            variant={statusMeta.variant}
            dot={statusMeta.pulseDot}
          />
        </View>

        {facility.description ? (
          <Text className="text-xs text-muted-foreground/90 leading-relaxed mt-1">
            {facility.description}
          </Text>
        ) : null}
      </View>

      {/* 3. Maintenance Warning Banner (when status === 'MAINTENANCE') */}
      {isMaintenance ? (
        <View className="mb-3 bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex-row items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-amber-800 dark:text-amber-200">
              Facility Under Maintenance
            </Text>
            <Text className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              This amenity is currently undergoing maintenance. Bookings are temporarily paused until work is completed.
            </Text>
          </View>
        </View>
      ) : null}

      {/* 4. Capacity & Booking Characteristics Section */}
      <DetailSection title="Capacity & Slot Timing" iconName="Users" collapsible={false}>
        <DetailRow
          label="Maximum Facility Capacity"
          value={`${facility.maxCapacity} Persons`}
          iconName="Users"
        />
        {facility.maxHeadcountPerReservation ? (
          <DetailRow
            label="Max Headcount Per Booking"
            value={`${facility.maxHeadcountPerReservation} Persons`}
            iconName="UserCheck"
          />
        ) : null}
        <DetailRow
          label="Slot Duration"
          value={`${facility.slotDurationMinutes} Minutes`}
          iconName="Timer"
        />
        {facility.setupBufferMinutes > 0 || facility.teardownBufferMinutes > 0 ? (
          <DetailRow
            label="Operational Buffers"
            value={`${facility.setupBufferMinutes}m setup / ${facility.teardownBufferMinutes}m teardown`}
            iconName="Clock"
            isLast={true}
          />
        ) : null}
      </DetailSection>

      {/* 5. Pricing Configuration Section (No client-side calculation) */}
      <DetailSection title="Pricing Configuration" iconName="DollarSign" collapsible={false}>
        <DetailRow
          label="Rate"
          value={pricingFormatted.displayRate}
          iconName="DollarSign"
        />
        <DetailRow
          label="Pricing Model"
          value={facility.pricingConfig?.type || 'FREE'}
          iconName="Tag"
        />
        <DetailRow
          label="Security Deposit"
          value={pricingFormatted.displayDeposit}
          iconName="ShieldCheck"
        />
        {facility.pricingConfig?.taxRate ? (
          <DetailRow
            label="Tax Rate"
            value={`${facility.pricingConfig.taxRate}%`}
            iconName="Percent"
            isLast={true}
          />
        ) : null}
      </DetailSection>

      {/* 6. Operating Hours Section (In facility IANA timezone) */}
      <DetailSection
        title={`Operating Schedule (${facility.timezone || 'UTC'})`}
        iconName="Clock"
        collapsible={true}
        defaultExpanded={true}
      >
        {operatingHoursList.map((entry, idx) => (
          <DetailRow
            key={entry.day}
            label={entry.day}
            value={entry.hours}
            iconName="Calendar"
            isLast={idx === operatingHoursList.length - 1}
          />
        ))}
      </DetailSection>

      {/* 7. Booking Rules Section */}
      {bookingRules ? (
        <DetailSection title="Reservation Rules & Policies" iconName="ShieldCheck" collapsible={true}>
          <DetailRow
            label="Approval Required"
            value={bookingRules.requiresApproval ? 'Yes (Supervisor Review)' : 'No (Instant)'}
            iconName="FileCheck"
          />
          <DetailRow
            label="Advance Booking Limit"
            value={`Up to ${bookingRules.maxAdvanceBookingDays} Days in Advance`}
            iconName="Calendar"
          />
          <DetailRow
            label="Minimum Advance Notice"
            value={`${bookingRules.minNoticeHours} Hours`}
            iconName="Clock"
          />
          <DetailRow
            label="Cancellation Notice Window"
            value={`${bookingRules.cancelNoticeHours} Hours before start`}
            iconName="AlertCircle"
          />
          {bookingRules.maxActiveReservationsPerResident ? (
            <DetailRow
              label="Active Bookings Per Resident"
              value={`Max ${bookingRules.maxActiveReservationsPerResident} concurrent`}
              iconName="Layers"
              isLast={true}
            />
          ) : null}
        </DetailSection>
      ) : null}

      {/* 8. Available Resources Section (for ROOM_RESOURCE or INVENTORY_TOOLS) */}
      {(facility.archetype === 'ROOM_RESOURCE' || facility.archetype === 'INVENTORY_TOOLS') &&
      resources.length > 0 ? (
        <DetailSection
          title={facility.archetype === 'INVENTORY_TOOLS' ? 'Inventory Assets & Stock' : 'Room Resources'}
          iconName={facility.archetype === 'INVENTORY_TOOLS' ? 'Wrench' : 'DoorOpen'}
          collapsible={false}
        >
          {resources.map((res, index) => (
            <DetailRow
              key={res._id}
              label={`${res.identifier} - ${res.name}`}
              value={
                <View className="flex-row items-center gap-1.5">
                  <StatusBadge
                    label={res.assetState}
                    variant={res.assetState === 'AVAILABLE' ? 'success' : 'warning'}
                  />
                  {res.totalBulkStock > 1 ? (
                    <Text className="text-xs font-semibold text-muted-foreground">
                      (Qty: {res.totalBulkStock})
                    </Text>
                  ) : null}
                </View>
              }
              iconName={facility.archetype === 'INVENTORY_TOOLS' ? 'Tool' : 'DoorClosed'}
              isLast={index === resources.length - 1}
            />
          ))}
        </DetailSection>
      ) : null}

      {/* 9. Primary Action Button */}
      {onBookClick ? (
        <View className="mt-4 pt-2">
          <Button
            variant={bookableCheck.canBook ? 'default' : 'outline'}
            size="lg"
            disabled={!bookableCheck.canBook}
            onPress={() => onBookClick(facility._id)}
            className="w-full h-12 rounded-2xl flex-row items-center justify-center gap-2 shadow-xs"
            accessibilityRole="button"
            accessibilityLabel={`Book ${facility.name}`}
          >
            <CalendarCheck
              size={18}
              className={bookableCheck.canBook ? 'text-primary-foreground' : 'text-muted-foreground'}
            />
            <Text
              className={cn(
                'text-sm font-bold',
                bookableCheck.canBook ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {isMaintenance
                ? 'Under Maintenance'
                : facility.status === 'INACTIVE'
                ? 'Facility Inactive'
                : 'Book Now'}
            </Text>
          </Button>
        </View>
      ) : null}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    );
  }

  return content;
}

export default ResidentAmenityDetailView;
