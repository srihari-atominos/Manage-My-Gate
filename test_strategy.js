import { mapFormToApiPayloadStrategy } from './mobile/mobile-app/src/features/visitor/utils/mapFormToApiPayloadStrategy.js';

const formData = {
  cabProvider: 'other',
  customCabProvider: 'Kavya Custom Cabs',
  cabVehicle: { vehicleNo: 'MH12', vehicleType: 'CAB', driverPhone: '1234567890' },
  cabSchedule: { usageType: 'ONE_TIME', arrivalWindow: 'IMMEDIATE', customVisitDate: '', customStartTime: '', customEndTime: '', selectedWeekdays: [], timeSlots: [] },
};

const context = { role: 'RESIDENT', orgId: 'org1' };

const payload = mapFormToApiPayloadStrategy('CAB', formData, context);
console.log(JSON.stringify(payload, null, 2));
