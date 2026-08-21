import { mapCabFormToApiPayload } from './mobile/mobile-app/src/features/visitor/utils/mapCabFormToApiPayload.js';

const payload = mapCabFormToApiPayload(
  'other',
  { vehicleNo: 'MH12', vehicleType: 'CAB', driverPhone: '1234567890' },
  { usageType: 'ONE_TIME', arrivalWindow: 'IMMEDIATE', customVisitDate: '', customStartTime: '', customEndTime: '', selectedWeekdays: [], timeSlots: [] },
  {},
  'Kavya Custom Cabs'
);

console.log(JSON.stringify(payload, null, 2));
