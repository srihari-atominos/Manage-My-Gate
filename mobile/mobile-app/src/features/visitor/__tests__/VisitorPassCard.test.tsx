import { mapGuestFormToApiPayload } from '../utils/mapGuestFormToApiPayload';
import { mapCabFormToApiPayload } from '../utils/mapCabFormToApiPayload';
import { mapDeliveryFormToApiPayload } from '../utils/mapDeliveryFormToApiPayload';
import { mapServiceFormToApiPayload } from '../utils/mapServiceFormToApiPayload';
import { mapGroupFormToApiPayload } from '../utils/mapGroupFormToApiPayload';
import { mapFormToApiPayloadStrategy } from '../utils/mapFormToApiPayloadStrategy';
import { validateGuestIdProofNumber } from '../components/guest/GuestPassOptionsStep';

describe('Visitor Management Mobile Pass Logic & Payload Mappings', () => {
  const baseContext = {
    orgId: '60c72b2f9b1d8e25d88db652',
    createdById: '60c72b2f9b1d8e25d88db650',
    villaId: '60c72b2f9b1d8e25d88db659',
    role: 'RESIDENT' as const,
  };

  describe('Guest Pass Mapping', () => {
    it('correctly maps standard guest pass form inputs to backend API payload', () => {
      const guestDetails = {
        visitorName: 'John Doe',
        phone: '9876543210',
        purpose: 'Dinner visit',
      };

      const guestSchedule = {
        visitDate: '2026-09-01',
        timeSlot: 'TODAY_EVENING',
      };

      const guestOptions = {
        entryMode: 'SINGLE' as const,
        vehicleNo: 'KA-01-AB-1234',
        gateInstructions: 'Direct to visitor parking slot 4',
        isIdProofPass: false,
      };

      const payload = mapGuestFormToApiPayload(guestDetails, guestSchedule, guestOptions, baseContext);

      expect(payload.passType).toBe('GUEST');
      expect(payload.visitorDetails.name).toBe('John Doe');
      expect(payload.visitorDetails.phone).toBe('9876543210');
      expect(payload.purpose).toContain('Dinner visit');
      expect(payload.purpose).toContain('Instructions: Direct to visitor parking slot 4');
      expect(payload.vehicleDetails?.number).toBe('KA-01-AB-1234');
      expect(payload.usageLimit.maxUses).toBe(1);
      expect(payload.validity.timeWindowStart).toBe('17:00');
      expect(payload.validity.timeWindowEnd).toBe('23:00');
    });

    it('correctly formats and validates ID Proof Pass', () => {
      const guestDetails = {
        visitorName: 'Rajesh Kumar',
        phone: '9123456780',
        purpose: 'Document Delivery',
      };

      const guestSchedule = {
        visitDate: '2026-09-01',
        timeSlot: 'CUSTOM',
        customStartTime: '10:00 AM',
        customEndTime: '04:00 PM',
      };

      const guestOptions = {
        entryMode: 'MULTIPLE' as const,
        vehicleNo: '',
        gateInstructions: '',
        isIdProofPass: true,
        idProofType: 'Aadhaar Card',
        idProofNumber: '123456789012',
      };

      const payload = mapGuestFormToApiPayload(guestDetails, guestSchedule, guestOptions);

      expect(payload.isIdProofPass).toBe(true);
      expect(payload.visitorDetails.idProofType).toBe('Aadhaar Card');
      expect(payload.visitorDetails.idProofNumber).toBe('123456789012');
      expect(payload.usageLimit.maxUses).toBe(99);
      expect(payload.validity.timeWindowStart).toBe('10:00');
      expect(payload.validity.timeWindowEnd).toBe('16:00');
    });

    describe('ID Proof Validation Utility', () => {
      it('validates 12-digit Aadhaar Card numbers', () => {
        expect(validateGuestIdProofNumber('Aadhaar Card', '123456789012')).toBeNull();
        expect(validateGuestIdProofNumber('Aadhaar Card', '12345')).toBe('Aadhaar number must be 12 numeric digits.');
      });

      it('validates PAN Card formats', () => {
        expect(validateGuestIdProofNumber('PAN Card', 'ABCDE1234F')).toBeNull();
        expect(validateGuestIdProofNumber('PAN Card', '12345')).toBe('Invalid PAN Card format (e.g. ABCDE1234F).');
      });
    });
  });

  describe('Cab Pass Mapping', () => {
    it('correctly maps one-time Uber Cab pass with vehicle plate', () => {
      const vehicle = {
        vehicleNo: 'MH-12-AB-9876',
        vehicleType: 'CAB' as const,
        driverPhone: '9888877777',
      };
      const schedule = {
        usageType: 'ONE_TIME' as const,
        arrivalWindow: 'IMMEDIATE' as const,
      };

      const payload = mapCabFormToApiPayload('uber', vehicle, schedule, baseContext);

      expect(payload.passType).toBe('CAB');
      expect(payload.vehicleDetails.vendor).toBe('UBER');
      expect(payload.vehicleDetails.number).toBe('MH-12-AB-9876');
      expect(payload.visitorDetails.phone).toBe('9888877777');
      expect(payload.usageLimit.maxUses).toBe(1);
    });

    it('correctly handles multi-use recurring cab pass with weekdays', () => {
      const vehicle = {
        vehicleNo: 'KA-05-C-1122',
        vehicleType: 'AUTO' as const,
      };
      const schedule = {
        usageType: 'MULTI_USE' as const,
        arrivalWindow: 'IMMEDIATE' as const,
        selectedWeekdays: ['MON', 'WED', 'FRI'],
        timeSlots: [{ startTime: '08:00 AM', endTime: '09:30 AM' }],
      };

      const payload = mapCabFormToApiPayload('ola', vehicle, schedule, baseContext);

      expect(payload.passType).toBe('CAB');
      expect(payload.usageLimit.maxUses).toBe(100);
      expect(payload.validity.allowedDays).toEqual([1, 3, 5]);
      expect(payload.validity.timeWindows).toEqual([{ start: '08:00', end: '09:30' }]);
    });
  });

  describe('Delivery Pass Mapping', () => {
    it('correctly maps delivery pass with LEAVE_AT_GATE setting isPrivate: true', () => {
      const details = {
        orderId: 'AMZ-99120',
        packageCount: '2',
        deliveryAction: 'LEAVE_AT_GATE' as const,
        instructions: 'Drop at clubhouse reception desk',
      };
      const validity = {
        usageType: 'ONE_TIME' as const,
        validityDuration: 'TWO_HOURS' as const,
      };

      const payload = mapDeliveryFormToApiPayload('amazon', details, validity, baseContext);

      expect(payload.passType).toBe('DELIVERY');
      expect(payload.isPrivate).toBe(true);
      expect(payload.deliveryDetails.instructions).toBe('Drop at clubhouse reception desk');
      expect(payload.usageLimit.maxUses).toBe(1);
    });

    it('correctly maps 30-minute quick delivery pass', () => {
      const details = {
        packageCount: '1',
        deliveryAction: 'DOORSTEP' as const,
      };
      const validity = {
        usageType: 'ONE_TIME' as const,
        validityDuration: 'THIRTY_MINS' as const,
      };

      const payload = mapDeliveryFormToApiPayload('blinkit', details, validity, baseContext);

      expect(payload.passType).toBe('DELIVERY');
      expect(payload.deliveryDetails.partner).toBe('BLINKIT');
      expect(payload.usageLimit.maxUses).toBe(1);

      const startMs = new Date(payload.validity.startDate).getTime();
      const endMs = new Date(payload.validity.endDate).getTime();
      const diffMins = Math.round((endMs - startMs) / (60 * 1000));
      expect(diffMins).toBe(30);
    });
  });

  describe('Service / Contractor Pass Mapping', () => {
    it('correctly maps service pass with weekdays and daily time slot', () => {
      const staff = {
        staffName: 'Suresh Kumar',
        phone: '9811122233',
        notes: 'Assigned for daily housekeeping',
      };
      const dateRange = {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      };
      const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
      const timeWindow = {
        preset: 'MORNING' as const,
        startTime: '08:00 AM',
        endTime: '01:00 PM',
      };

      const payload = mapServiceFormToApiPayload(staff, 'maid', dateRange, weekdays, timeWindow, baseContext);

      expect(payload.passType).toBe('SERVICE');
      expect(payload.visitorDetails.name).toBe('Suresh Kumar');
      expect(payload.serviceDetails.category).toBe('MAID');
      expect(payload.validity.timeWindowStart).toBe('08:00');
      expect(payload.validity.timeWindowEnd).toBe('13:00');
      expect(payload.validity.allowedDays).toEqual([1, 2, 3, 4, 5]);
      expect(payload.usageLimit.maxUses).toBe(999);
    });
  });

  describe('Group Pass Mapping', () => {
    it('correctly maps multi-guest event pass', () => {
      const groupDetails = {
        eventTitle: 'Birthday Party',
        purpose: 'Evening celebration',
        visitDate: '2026-09-05',
        startTime: '06:00 PM',
        endTime: '11:00 PM',
        numberOfPasses: '15',
      };
      const guests = [
        { id: 'g1', name: 'Kavita Roy', phone: '9900011122' },
        { id: 'g2', name: 'Amit Verma', phone: '9900033344' },
      ];

      const payload = mapGroupFormToApiPayload(groupDetails, guests, baseContext);

      expect(payload.passType).toBe('GUEST');
      expect(payload.isGroupPass).toBe(true);
      expect(payload.visitorDetails.name).toBe('Birthday Party');
      expect(payload.groupGuests).toHaveLength(2);
      expect(payload.groupGuests[0].name).toBe('Kavita Roy');
      expect(payload.usageLimit.maxUses).toBe(15);
      expect(payload.validity.timeWindowStart).toBe('18:00');
      expect(payload.validity.timeWindowEnd).toBe('23:00');
    });
  });

  describe('Strategy Mapper for Admin vs Resident context', () => {
    it('maps to ADMIN_GUEST when role is ADMIN and no villaId is provided', () => {
      const formData = {
        guestDetails: { visitorName: 'Inspector Rao', phone: '', purpose: 'Audit' },
        guestSchedule: { visitDate: '2026-09-01', timeSlot: 'NOW' },
        guestOptions: { entryMode: 'SINGLE', vehicleNo: '', gateInstructions: '' },
      };

      const adminContext = {
        role: 'ADMIN' as const,
        orgId: '60c72b2f9b1d8e25d88db652',
      };

      const payload = mapFormToApiPayloadStrategy('GUEST', formData, adminContext);
      expect(payload.passType).toBe('ADMIN_GUEST');
    });

    it('maps to GUEST when role is RESIDENT', () => {
      const formData = {
        guestDetails: { visitorName: 'Sister', phone: '', purpose: 'Holiday' },
        guestSchedule: { visitDate: '2026-09-01', timeSlot: 'NOW' },
        guestOptions: { entryMode: 'SINGLE', vehicleNo: '', gateInstructions: '' },
      };

      const residentContext = {
        role: 'RESIDENT' as const,
        orgId: '60c72b2f9b1d8e25d88db652',
        villaId: '60c72b2f9b1d8e25d88db659',
      };

      const payload = mapFormToApiPayloadStrategy('GUEST', formData, residentContext);
      expect(payload.passType).toBe('GUEST');
      expect(payload.villaId).toBe('60c72b2f9b1d8e25d88db659');
    });
  });

  describe('Gate Console Search & Matching Logic', () => {
    const mockPasses = [
      {
        _id: '60c72b2f9b1d8e25d88db699',
        code: '377208',
        visitorName: 'David Lee',
        vehicleDetails: { number: 'KA-01-MJ-5544' },
        visitorDetails: { name: 'David Lee', phone: '9876543210' },
      },
      {
        _id: '60c72b2f9b1d8e25d88db698',
        code: '112233',
        visitorName: 'Swiggy Courier',
        vehicleDetails: { number: 'MH-12-AB-9999' },
        visitorDetails: { name: 'Swiggy Courier', phone: '9888877777' },
      },
    ];

    it('matches pass by vehicle license plate without formatting', () => {
      const query = 'ka01mj5544';
      const cleanQuery = query.replace(/[\s-]/g, '').toLowerCase();

      const matched = mockPasses.find((p) =>
        p.vehicleDetails?.number?.toLowerCase().replace(/[\s-]/g, '').includes(cleanQuery)
      );

      expect(matched).toBeDefined();
      expect(matched?.visitorName).toBe('David Lee');
      expect(matched?.code).toBe('377208');
    });

    it('matches pass by visitor name substring', () => {
      const query = 'swiggy';
      const matched = mockPasses.find((p) =>
        p.visitorDetails?.name?.toLowerCase().includes(query.toLowerCase())
      );

      expect(matched).toBeDefined();
      expect(matched?.code).toBe('112233');
    });
  });
});



