/**
 * ResidentAmenityDetailSheet Component
 * Contextual bottom sheet embedding the authoritative ResidentAmenityDetailView.
 * Supports AmenityFacility and AmenityResource[] models while preserving legacy Amenity compatibility.
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { AmenityFacility, AmenityResource } from '../types/amenityDomain.types';
import { Amenity } from '../store/amenitySlice';
import { ResidentAmenityDetailView } from './ResidentAmenityDetailView';
import { useTranslation } from '@/src/utils/i18n';

export interface ResidentAmenityDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  amenity: AmenityFacility | Amenity | null;
  resources?: AmenityResource[];
  onBookClick: (amenityId: string) => void;
}

export function ResidentAmenityDetailSheet({
  visible,
  onClose,
  amenity,
  resources = [],
  onBookClick,
}: ResidentAmenityDetailSheetProps) {
  const { t } = useTranslation();
  if (!visible || !amenity) return null;

  // Adapt legacy Amenity to AmenityFacility structure if needed
  const normalizedFacility: AmenityFacility = (amenity as AmenityFacility).archetype
    ? (amenity as AmenityFacility)
    : {
        _id: amenity._id,
        orgId: (amenity as any).orgId || '',
        name: amenity.name,
        description: amenity.description,
        archetype: ((amenity as any).type || (amenity as any).category || 'SHARED_CAPACITY') as any,
        status: String(amenity.status || 'ACTIVE').toUpperCase() as any,
        maxCapacity: (amenity as any).capacity || 20,
        maxHeadcountPerReservation: (amenity as any).maxHeadcountPerReservation || 5,
        slotDurationMinutes: (amenity as any).bookingRules?.slotDurationMinutes || 60,
        setupBufferMinutes: 0,
        teardownBufferMinutes: 0,
        timezone: (amenity as any).timezone || 'UTC',
        pricingConfig: {
          type: (amenity as any).pricing?.pricingType === 'daily' ? 'DAILY' : 'HOURLY',
          baseRate: (amenity as any).pricing?.baseRate ?? (amenity as any).bookingFee ?? 0,
          depositAmount: (amenity as any).pricing?.securityDeposit ?? 0,
          taxRate: 0,
          currency: (amenity as any).pricingConfig?.currency || 'INR',
        },
        bookingRules: {
          minNoticeHours: 1,
          maxAdvanceBookingDays: (amenity as any).bookingRules?.advanceBookingDays || 7,
          cancelNoticeHours: 2,
          requiresApproval: false,
          maxActiveReservationsPerResident: (amenity as any).maxBookingsPerUserPerSlot || 1,
        },
        operatingHours: Array.isArray((amenity as any).operatingHours) && (amenity as any).operatingHours.length > 0
          ? (amenity as any).operatingHours
          : ((amenity as any).openTime && (amenity as any).closeTime
              ? [0, 1, 2, 3, 4, 5, 6].map((day) => ({
                  dayOfWeek: day,
                  opensAt: (amenity as any).openTime,
                  closesAt: (amenity as any).closeTime,
                  openTime: (amenity as any).openTime,
                  closeTime: (amenity as any).closeTime,
                  isOpen: true,
                }))
              : []),
        images: Array.isArray(amenity.images) ? amenity.images : (amenity as any).imageUrl ? [(amenity as any).imageUrl] : [],
        createdAt: (amenity as any).createdAt || new Date().toISOString(),
        updatedAt: (amenity as any).updatedAt || new Date().toISOString(),
      };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('amenity_details_reservation', 'Amenity Details & Reservation')}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="max-h-[75vh]"
        contentContainerClassName="pb-6"
      >
        <ResidentAmenityDetailView
          facility={normalizedFacility}
          resources={resources}
          onBookClick={(id) => {
            onClose();
            onBookClick(id);
          }}
          scrollable={false}
        />
      </ScrollView>
    </BottomSheet>
  );
}

export default ResidentAmenityDetailSheet;
