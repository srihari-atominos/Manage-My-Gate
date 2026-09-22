/**
 * Amenity Management v2 - Presentation Utilities
 * Centralizes UI presentation mappings for frozen backend archetypes, facility statuses,
 * pricing, operating hours (with IANA timezone), and booking eligibility.
 */

import {
  AmenityArchetype,
  AmenityFacilityStatus,
  AmenityFacilityPricingConfig,
  AmenityFacilityOperatingHour,
  AmenityFacility,
} from '../types/amenityDomain.types';
import { StatusVariant } from '@/components/ui/StatusBadge';

export interface ArchetypePresentationMeta {
  archetype: AmenityArchetype;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
  badgeBg: string;
  badgeText: string;
}

export interface FacilityStatusPresentationMeta {
  status: AmenityFacilityStatus;
  label: string;
  variant: StatusVariant;
  isBookable: boolean;
  pulseDot: boolean;
}

const ARCHETYPE_PRESENTATION_MAP: Record<AmenityArchetype, ArchetypePresentationMeta> = {
  SHARED_CAPACITY: {
    archetype: 'SHARED_CAPACITY',
    label: 'Shared Capacity',
    shortLabel: 'Shared',
    iconName: 'Users',
    description: 'Shared community facility with concurrent capacity quota',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-600 dark:text-blue-400',
  },
  EXCLUSIVE_HOURLY: {
    archetype: 'EXCLUSIVE_HOURLY',
    label: 'Exclusive Hourly',
    shortLabel: 'Exclusive',
    iconName: 'Timer',
    description: 'Individual court or pitch with exclusive slot booking',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
  },
  EVENT_SPACE: {
    archetype: 'EVENT_SPACE',
    label: 'Event Space',
    shortLabel: 'Event',
    iconName: 'Sparkles',
    description: 'Community banquet hall and terrace for gatherings & celebrations',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-600 dark:text-amber-400',
  },
  ROOM_RESOURCE: {
    archetype: 'ROOM_RESOURCE',
    label: 'Room Resource',
    shortLabel: 'Room',
    iconName: 'DoorOpen',
    description: 'Dedicated room or resource for reserved meetings & activities',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-600 dark:text-purple-400',
  },
  INVENTORY_TOOLS: {
    archetype: 'INVENTORY_TOOLS',
    label: 'Inventory & Tools',
    shortLabel: 'Tools',
    iconName: 'Wrench',
    description: 'Equipment, kits, and machinery available for resident checkout',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
  },
};

const STATUS_PRESENTATION_MAP: Record<AmenityFacilityStatus | 'DECOMMISSIONED', FacilityStatusPresentationMeta> = {
  DRAFT: {
    status: 'DRAFT',
    label: 'Draft',
    variant: 'neutral',
    isBookable: false,
    pulseDot: false,
  },
  ACTIVE: {
    status: 'ACTIVE',
    label: 'Available',
    variant: 'success',
    isBookable: true,
    pulseDot: true,
  },
  MAINTENANCE: {
    status: 'MAINTENANCE',
    label: 'Under Maintenance',
    variant: 'warning',
    isBookable: false,
    pulseDot: false,
  },
  INACTIVE: {
    status: 'INACTIVE',
    label: 'Inactive',
    variant: 'neutral',
    isBookable: false,
    pulseDot: false,
  },
  DECOMMISSIONED: {
    status: 'DECOMMISSIONED' as any,
    label: 'Decommissioned',
    variant: 'neutral',
    isBookable: false,
    pulseDot: false,
  },
};

/**
 * Returns the presentation metadata for a given backend archetype.
 */
export const getArchetypeMeta = (archetype?: AmenityArchetype | string): ArchetypePresentationMeta => {
  if (archetype && archetype in ARCHETYPE_PRESENTATION_MAP) {
    return ARCHETYPE_PRESENTATION_MAP[archetype as AmenityArchetype];
  }
  return {
    archetype: 'SHARED_CAPACITY',
    label: 'Facility',
    shortLabel: 'Facility',
    iconName: 'Building2',
    description: 'Community facility',
    badgeBg: 'bg-primary/10',
    badgeText: 'text-primary',
  };
};

/**
 * Returns the presentation metadata for a given backend facility status.
 */
export const getFacilityStatusMeta = (status?: AmenityFacilityStatus | string): FacilityStatusPresentationMeta => {
  if (status && status in STATUS_PRESENTATION_MAP) {
    return STATUS_PRESENTATION_MAP[status as AmenityFacilityStatus];
  }
  return {
    status: 'INACTIVE',
    label: 'Inactive',
    variant: 'neutral',
    isBookable: false,
    pulseDot: false,
  };
};

/**
 * Formats pricing configuration for display without calculating local totals.
 */
export const formatFacilityPricing = (
  pricingConfig?: AmenityFacilityPricingConfig | any
): {
  displayRate: string;
  displayDeposit: string;
  pricingTypeLabel: string;
  isFree: boolean;
} => {
  const pType = pricingConfig?.type || pricingConfig?.pricingType || 'FREE';
  const baseRate = Number(pricingConfig?.baseRate ?? 0);
  const depositAmount = Number(pricingConfig?.depositAmount ?? pricingConfig?.securityDeposit ?? 0);
  const currency = pricingConfig?.currency || 'INR';

  if (!pricingConfig || pType === 'FREE' || (baseRate === 0 && depositAmount === 0)) {
    return {
      displayRate: 'Free Access',
      displayDeposit: 'No Deposit Required',
      pricingTypeLabel: 'Free',
      isFree: true,
    };
  }

  const typeMap: Record<string, string> = {
    HOURLY: 'hour',
    DAILY: 'day',
    FIXED_EVENT: 'event',
    TIERED: 'session',
  };
  const unit = typeMap[pType] || 'slot';
  const displayRate = baseRate > 0 ? `${baseRate} ${currency} / ${unit}` : 'Free Access';
  const displayDeposit =
    depositAmount > 0
      ? `${depositAmount} ${currency} (Refundable Deposit)`
      : 'No Deposit Required';

  return {
    displayRate,
    displayDeposit,
    pricingTypeLabel: pType,
    isFree: baseRate === 0,
  };
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats weekly operating hours using the facility's IANA timezone.
 */
export const formatFacilityOperatingHours = (
  operatingHours?: AmenityFacilityOperatingHour[],
  timezone?: string
): Array<{ day: string; hours: string; isOpen: boolean }> => {
  if (!operatingHours || !Array.isArray(operatingHours) || operatingHours.length === 0) {
    return [
      {
        day: 'Daily',
        hours: `08:00 - 22:00 (${timezone || 'UTC'})`,
        isOpen: true,
      },
    ];
  }

  return operatingHours.map((entry) => {
    const dayName = DAY_NAMES[entry.dayOfWeek] || `Day ${entry.dayOfWeek}`;
    if (!entry.isOpen) {
      return {
        day: dayName,
        hours: 'Closed',
        isOpen: false,
      };
    }
    const opensAt = (entry as any).opensAt || (entry as any).openTime || '08:00';
    const closesAt = (entry as any).closesAt || (entry as any).closeTime || '22:00';
    return {
      day: dayName,
      hours: `${opensAt} - ${closesAt}`,
      isOpen: true,
    };
  });
};

/**
 * Pure helper determining whether a resident can initiate booking for this facility.
 * Booking is permitted strictly when status === 'ACTIVE'.
 */
export const isFacilityBookable = (
  facility: AmenityFacility | null | undefined
): { canBook: boolean; reason?: string } => {
  if (!facility) {
    return { canBook: false, reason: 'Facility data unavailable' };
  }

  if (facility.status === 'MAINTENANCE') {
    return { canBook: false, reason: 'Facility is currently under maintenance' };
  }

  if (facility.status !== 'ACTIVE') {
    return { canBook: false, reason: 'Facility is currently inactive' };
  }

  return { canBook: true };
};
