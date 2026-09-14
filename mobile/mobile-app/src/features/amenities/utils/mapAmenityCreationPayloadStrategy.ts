import { AmenityArchetype, AmenityPricingType } from '../types/amenityDomain.types';

export interface AmenityCreationFormState {
  // Basic Info
  name: string;
  code: string;
  archetype: AmenityArchetype;
  category: string;
  location: string;
  status: 'active' | 'inactive';
  imageUrl?: string;
  description?: string;

  // Operating Schedule
  openTime: string;
  closeTime: string;
  openDays: number[]; // 0 to 6

  // Specifications
  maxCapacity: number | string;
  maxHeadcountPerReservation: number | string;
  slotDurationMinutes: number | string;
  bufferTimeMinutes: number | string;
  advanceBookingDays: number | string;
  advanceNoticeHours: number | string;
  requiresApproval: boolean;
  isMultiResourceFacility: boolean;
  subRooms?: Array<{ id: string; name: string; capacity: number }>;
  roomAmenities?: string[];
  availableStock?: number | string;
  maxLoanHours?: number | string;
  requiresInspection?: boolean;

  // Pricing & Policies
  pricingType: AmenityPricingType;
  baseRate: number | string;
  securityDeposit: number | string;
  securityDepositDescription?: string;
  isCancellationAllowed: boolean;
  refundCutoffHours: number | string;
  refundPercentage: number | string;
}

/**
 * Maps and sanitizes the Creation Wizard form state into a strictly conforming
 * payload for backend amenityFacility.model.js, eliminating schema pollution.
 */
export function mapAmenityCreationPayloadStrategy(
  form: AmenityCreationFormState,
  isDraft = false
) {
  // Format HH:MM safely
  const formatTime = (t?: string, defaultVal = '06:00') => {
    if (!t) return defaultVal;
    const trimmed = t.trim();
    if (!trimmed) return defaultVal;
    if (/^\d:[0-5]\d$/.test(trimmed)) return `0${trimmed}`;
    return trimmed;
  };

  const openTime = formatTime(form.openTime, '06:00');
  const closeTime = formatTime(form.closeTime, '22:00');

  // Build full 7-day operating hours array
  const operatingHours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    dayOfWeek: day,
    openTime,
    closeTime,
    isOpen: form.openDays.includes(day),
  }));

  // Resolve pricing
  const numBaseRate = Math.max(0, parseFloat(String(form.baseRate || 0)) || 0);
  const numDeposit = Math.max(0, parseFloat(String(form.securityDeposit || 0)) || 0);

  const pricingConfig = {
    pricingType: form.pricingType || 'FREE',
    baseRate: form.pricingType === 'FREE' ? 0 : numBaseRate,
    currency: 'INR',
    securityDeposit: numDeposit,
    taxPercentage: 0,
    cancellationFee: 0,
  };

  const cancellationPolicy = {
    isAllowed: form.isCancellationAllowed ?? true,
    refundCutoffHours: Math.max(0, parseInt(String(form.refundCutoffHours || 24), 10) || 24),
    refundPercentage: Math.min(
      100,
      Math.max(0, parseInt(String(form.refundPercentage || 100), 10) || 100)
    ),
  };

  const status = isDraft
    ? 'DRAFT'
    : form.status === 'inactive'
    ? 'INACTIVE'
    : 'ACTIVE';
  const isActive = isDraft ? false : form.status !== 'inactive';

  // Base facility object
  const basePayload: any = {
    name: form.name.trim(),
    code: (form.code || form.name.replace(/[^A-Za-z0-9]/g, '-').toUpperCase()).trim(),
    archetype: form.archetype,
    category: form.category || 'General',
    location: form.location?.trim() || '',
    description: form.description?.trim() || '',
    timezone: 'Asia/Kolkata',
    operatingHours,
    pricingConfig,
    cancellationPolicy,
    isActive,
    status,
    isDraft,
    images: form.imageUrl ? [form.imageUrl] : [],
    imageUrl: form.imageUrl || '',
  };

  // Archetype-specific attributes & isolation
  switch (form.archetype) {
    case 'SHARED_CAPACITY': {
      const cap = Math.max(1, parseInt(String(form.maxCapacity || 50), 10) || 50);
      const quota = Math.max(
        1,
        parseInt(String(form.maxHeadcountPerReservation || 2), 10) || 2
      );
      return {
        ...basePayload,
        maxCapacity: cap,
        maxHeadcountPerReservation: quota,
        requiresApproval: false,
        slotDurationMinutes: 60,
        setupBufferMinutes: 0,
      };
    }

    case 'EXCLUSIVE_HOURLY': {
      const slotDuration = Math.max(
        15,
        parseInt(String(form.slotDurationMinutes || 60), 10) || 60
      );
      const buffer = Math.max(0, parseInt(String(form.bufferTimeMinutes || 0), 10) || 0);
      const advanceDays = Math.max(
        1,
        parseInt(String(form.advanceBookingDays || 7), 10) || 7
      );
      return {
        ...basePayload,
        maxCapacity: 1,
        slotDurationMinutes: slotDuration,
        setupBufferMinutes: buffer,
        advanceBookingDays: advanceDays,
        requiresApproval: false,
      };
    }

    case 'EVENT_SPACE': {
      const advanceDays = Math.max(
        1,
        parseInt(String(form.advanceBookingDays || 30), 10) || 30
      );
      const advanceNotice = Math.max(
        0,
        parseInt(String(form.advanceNoticeHours || 72), 10) || 72
      );
      return {
        ...basePayload,
        maxCapacity: Math.max(1, parseInt(String(form.maxCapacity || 100), 10) || 100),
        requiresApproval: form.requiresApproval ?? true,
        advanceBookingDays: advanceDays,
        minNoticeHours: advanceNotice,
        slotDurationMinutes: 720, // 12 hours block standard
      };
    }

    case 'ROOM_RESOURCE': {
      return {
        ...basePayload,
        maxCapacity: Math.max(1, parseInt(String(form.maxCapacity || 10), 10) || 10),
        isMultiResourceFacility: form.isMultiResourceFacility ?? true,
        slotDurationMinutes: Math.max(
          15,
          parseInt(String(form.slotDurationMinutes || 60), 10) || 60
        ),
        setupBufferMinutes: 10,
        subRooms: form.subRooms || [],
        roomAmenities: form.roomAmenities || [],
      };
    }

    case 'INVENTORY_TOOLS': {
      const stock = Math.max(1, parseInt(String(form.availableStock || 1), 10) || 1);
      const loanHours = Math.max(1, parseInt(String(form.maxLoanHours || 24), 10) || 24);
      return {
        ...basePayload,
        maxCapacity: stock,
        availableStock: stock,
        maxLoanHours: loanHours,
        requiresInspection: form.requiresInspection ?? true,
        slotDurationMinutes: loanHours * 60,
      };
    }

    default:
      return basePayload;
  }
}
