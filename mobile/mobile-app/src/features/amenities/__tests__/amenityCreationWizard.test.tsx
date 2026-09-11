import {
  CREATION_STEP_DEFINITIONS,
  ARCHETYPE_CATALOG_OPTIONS,
  SCHEDULE_PRESETS,
  DURATION_PRESETS,
  BUFFER_PRESETS,
  QUOTA_PRESETS,
  ADVANCE_DAYS_PRESETS,
} from '../constants/amenityCatalogPresets';
import {
  mapAmenityCreationPayloadStrategy,
  AmenityCreationFormState,
} from '../utils/mapAmenityCreationPayloadStrategy';
import { AmenityArchetype } from '../types/amenityDomain.types';

describe('Amenity Creation Wizard - Architecture & Payload Strategy', () => {
  describe('1. Dynamic Step Definitions by Archetype', () => {
    const CANONICAL_ARCHETYPES: AmenityArchetype[] = [
      'SHARED_CAPACITY',
      'EXCLUSIVE_HOURLY',
      'EVENT_SPACE',
      'ROOM_RESOURCE',
      'INVENTORY_TOOLS',
    ];

    it('defines distinct step lists for all 5 canonical archetypes', () => {
      CANONICAL_ARCHETYPES.forEach((arch) => {
        const steps = CREATION_STEP_DEFINITIONS[arch];
        expect(steps).toBeDefined();
        expect(steps.length).toBeGreaterThanOrEqual(4);
        expect(steps[0].key).toBe('info');
        expect(steps[1].key).toBe('schedule');
        expect(steps[steps.length - 1].key).toBe('review');
      });
    });

    it('assigns SHARED_CAPACITY to headcount quota step', () => {
      const steps = CREATION_STEP_DEFINITIONS.SHARED_CAPACITY;
      const specStep = steps.find((s) => s.key === 'capacity-rules');
      expect(specStep).toBeDefined();
      expect(specStep?.title).toBe('Headcount & Quotas');
    });

    it('assigns EXCLUSIVE_HOURLY to court slot & buffer step', () => {
      const steps = CREATION_STEP_DEFINITIONS.EXCLUSIVE_HOURLY;
      const specStep = steps.find((s) => s.key === 'court-slots');
      expect(specStep).toBeDefined();
      expect(specStep?.title).toBe('Slot & Buffer Setup');
    });

    it('assigns EVENT_SPACE to event approvals & notice step', () => {
      const steps = CREATION_STEP_DEFINITIONS.EVENT_SPACE;
      const specStep = steps.find((s) => s.key === 'event-rules');
      expect(specStep).toBeDefined();
      expect(specStep?.title).toBe('Event Space & Approvals');
    });

    it('assigns ROOM_RESOURCE to sub-rooms & amenities step', () => {
      const steps = CREATION_STEP_DEFINITIONS.ROOM_RESOURCE;
      const specStep = steps.find((s) => s.key === 'room-setup');
      expect(specStep).toBeDefined();
      expect(specStep?.title).toBe('Sub-Rooms & Amenities');
    });

    it('assigns INVENTORY_TOOLS to stock quantity & loan window step', () => {
      const steps = CREATION_STEP_DEFINITIONS.INVENTORY_TOOLS;
      const specStep = steps.find((s) => s.key === 'inventory-stock');
      expect(specStep).toBeDefined();
      expect(specStep?.title).toBe('Stock & Loan Windows');
    });
  });

  describe('2. Catalog Options & Multi-Chip Presets', () => {
    it('provides rich presentation metadata for 5 archetypes in the sheet catalog', () => {
      expect(ARCHETYPE_CATALOG_OPTIONS).toHaveLength(5);
      ARCHETYPE_CATALOG_OPTIONS.forEach((opt) => {
        expect(opt.archetype).toBeDefined();
        expect(opt.label).toBeDefined();
        expect(opt.icon).toBeDefined();
        expect(opt.examples).toBeDefined();
        expect(opt.defaultPricingType).toBeDefined();
      });
    });

    it('provides verified chip presets for slots, buffers, and quotas', () => {
      expect(DURATION_PRESETS).toEqual([30, 45, 60, 90, 120]);
      expect(BUFFER_PRESETS).toEqual([0, 10, 15, 30]);
      expect(QUOTA_PRESETS).toEqual([1, 2, 4, 6]);
      expect(ADVANCE_DAYS_PRESETS).toEqual([3, 7, 14, 30]);
      expect(SCHEDULE_PRESETS).toHaveLength(3);
    });
  });

  describe('3. Payload Strategy Mapper per Archetype', () => {
    const baseForm: AmenityCreationFormState = {
      name: 'Olympic Swimming Pool',
      code: 'FAC-POOL-01',
      archetype: 'SHARED_CAPACITY',
      category: 'Pool & Spa',
      location: 'Clubhouse West Wing',
      status: 'active',
      imageUrl: 'https://images.unsplash.com/pool.jpg',
      description: 'Standard 50m lap pool.',
      openTime: '06:00',
      closeTime: '22:00',
      openDays: [0, 1, 2, 3, 4, 5, 6],
      maxCapacity: 60,
      maxHeadcountPerReservation: 4,
      slotDurationMinutes: 60,
      bufferTimeMinutes: 10,
      advanceBookingDays: 7,
      advanceNoticeHours: 24,
      requiresApproval: false,
      isMultiResourceFacility: false,
      pricingType: 'FREE',
      baseRate: 0,
      securityDeposit: 0,
      isCancellationAllowed: true,
      refundCutoffHours: 24,
      refundPercentage: 100,
    };

    it('correctly maps SHARED_CAPACITY without court mutex buffer pollution', () => {
      const payload = mapAmenityCreationPayloadStrategy(baseForm);

      expect(payload.archetype).toBe('SHARED_CAPACITY');
      expect(payload.name).toBe('Olympic Swimming Pool');
      expect(payload.code).toBe('FAC-POOL-01');
      expect(payload.maxCapacity).toBe(60);
      expect(payload.maxHeadcountPerReservation).toBe(4);
      expect(payload.requiresApproval).toBe(false);
      expect(payload.setupBufferMinutes).toBe(0); // Cleansed for shared pools
      expect(payload.operatingHours).toHaveLength(7);
      expect(payload.operatingHours[0].openTime).toBe('06:00');
      expect(payload.operatingHours[0].closeTime).toBe('22:00');
      expect(payload.operatingHours[0].isOpen).toBe(true);
      expect(payload.pricingConfig.pricingType).toBe('FREE');
    });

    it('correctly maps EXCLUSIVE_HOURLY with court slot mutex & buffers', () => {
      const tennisForm: AmenityCreationFormState = {
        ...baseForm,
        name: 'Tennis Court #1',
        code: 'FAC-TENNIS-01',
        archetype: 'EXCLUSIVE_HOURLY',
        category: 'Sports',
        slotDurationMinutes: 90,
        bufferTimeMinutes: 15,
        advanceBookingDays: 14,
        pricingType: 'HOURLY',
        baseRate: 350,
      };

      const payload = mapAmenityCreationPayloadStrategy(tennisForm);

      expect(payload.archetype).toBe('EXCLUSIVE_HOURLY');
      expect(payload.maxCapacity).toBe(1); // Exactly 1 booking per court unit
      expect(payload.slotDurationMinutes).toBe(90);
      expect(payload.setupBufferMinutes).toBe(15);
      expect(payload.advanceBookingDays).toBe(14);
      expect(payload.pricingConfig.pricingType).toBe('HOURLY');
      expect(payload.pricingConfig.baseRate).toBe(350);
    });

    it('correctly maps EVENT_SPACE with mandatory admin approval and advance notice', () => {
      const eventForm: AmenityCreationFormState = {
        ...baseForm,
        name: 'Community Banquet Hall',
        code: 'FAC-HALL-01',
        archetype: 'EVENT_SPACE',
        category: 'Event Space',
        maxCapacity: 200,
        advanceNoticeHours: 72,
        advanceBookingDays: 60,
        requiresApproval: true,
        pricingType: 'DAILY',
        baseRate: 5000,
        securityDeposit: 10000,
      };

      const payload = mapAmenityCreationPayloadStrategy(eventForm);

      expect(payload.archetype).toBe('EVENT_SPACE');
      expect(payload.maxCapacity).toBe(200);
      expect(payload.requiresApproval).toBe(true);
      expect(payload.minNoticeHours).toBe(72);
      expect(payload.advanceBookingDays).toBe(60);
      expect(payload.pricingConfig.pricingType).toBe('DAILY');
      expect(payload.pricingConfig.baseRate).toBe(5000);
      expect(payload.pricingConfig.securityDeposit).toBe(10000);
    });

    it('correctly maps ROOM_RESOURCE with sub-room definitions and amenities', () => {
      const roomForm: AmenityCreationFormState = {
        ...baseForm,
        name: 'Co-Working Conference Hub',
        code: 'FAC-CONF-01',
        archetype: 'ROOM_RESOURCE',
        category: 'Workspace',
        isMultiResourceFacility: true,
        slotDurationMinutes: 60,
        subRooms: [
          { id: 'r1', name: 'Boardroom A', capacity: 12 },
          { id: 'r2', name: 'Pod B', capacity: 4 },
        ],
        roomAmenities: ['wifi', 'projector', 'whiteboard'],
        pricingType: 'HOURLY',
        baseRate: 200,
      };

      const payload = mapAmenityCreationPayloadStrategy(roomForm);

      expect(payload.archetype).toBe('ROOM_RESOURCE');
      expect(payload.isMultiResourceFacility).toBe(true);
      expect(payload.subRooms).toHaveLength(2);
      expect(payload.subRooms[0].name).toBe('Boardroom A');
      expect(payload.roomAmenities).toEqual(['wifi', 'projector', 'whiteboard']);
    });

    it('correctly maps INVENTORY_TOOLS with stock count and loan inspection requirements', () => {
      const toolsForm: AmenityCreationFormState = {
        ...baseForm,
        name: 'Community Power Drill Kit',
        code: 'FAC-TOOL-01',
        archetype: 'INVENTORY_TOOLS',
        category: 'General',
        availableStock: 8,
        maxLoanHours: 48,
        requiresInspection: true,
        pricingType: 'FREE',
      };

      const payload = mapAmenityCreationPayloadStrategy(toolsForm);

      expect(payload.archetype).toBe('INVENTORY_TOOLS');
      expect(payload.availableStock).toBe(8);
      expect(payload.maxCapacity).toBe(8);
      expect(payload.maxLoanHours).toBe(48);
      expect(payload.requiresInspection).toBe(true);
    });

    it('correctly sets active vs inactive days in operatingHours', () => {
      const partialDaysForm: AmenityCreationFormState = {
        ...baseForm,
        openDays: [1, 2, 3, 4, 5], // Monday through Friday only
      };

      const payload = mapAmenityCreationPayloadStrategy(partialDaysForm);

      expect(payload.operatingHours[0].isOpen).toBe(false); // Sunday
      expect(payload.operatingHours[1].isOpen).toBe(true); // Monday
      expect(payload.operatingHours[5].isOpen).toBe(true); // Friday
      expect(payload.operatingHours[6].isOpen).toBe(false); // Saturday
    });
  });
});
