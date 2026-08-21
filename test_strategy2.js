function mapCabFormToApiPayload(
  provider,
  vehicle,
  schedule,
  context = {},
  customProviderName
) {
  const now = new Date();
  const isMultiUse = schedule.usageType === 'MULTI_USE';
  const rawVendor =
    provider === 'other' && customProviderName && customProviderName.trim()
      ? customProviderName.trim()
      : provider;

  const vendorName = (rawVendor || 'CAB').toUpperCase();
  const vehicleType = (vehicle.vehicleType || 'CAB').toUpperCase();
  const visitorName = `${vendorName} Driver`;
  return {
    passType: 'CAB',
    visitorDetails: {
      name: visitorName,
    },
    vehicleDetails: {
      vendor: vendorName,
      number: vehicle.vehicleNo ? vehicle.vehicleNo.trim().toUpperCase() : 'UNKNOWN',
      vehicleType: vehicleType,
    },
  };
}

function mapFormToApiPayloadStrategy(passType, formData, context) {
  const baseContext = {
    orgId: context.orgId,
    role: context.role,
  };

  switch (passType) {
    case 'CAB': {
      const payload = mapCabFormToApiPayload(
        formData.cabProvider,
        formData.cabVehicle,
        formData.cabSchedule,
        baseContext,
        formData.customCabProvider
      );
      return {
        ...payload,
        ...baseContext,
        passType: 'CAB',
      };
    }
  }
}

const formData = {
  cabProvider: 'other',
  customCabProvider: 'Kavya Custom Cabs',
  cabVehicle: { vehicleNo: 'MH12', vehicleType: 'CAB', driverPhone: '1234567890' },
  cabSchedule: { usageType: 'ONE_TIME', arrivalWindow: 'IMMEDIATE', customVisitDate: '', customStartTime: '', customEndTime: '', selectedWeekdays: [], timeSlots: [] },
};
const context = { role: 'RESIDENT', orgId: 'org1' };
const payload = mapFormToApiPayloadStrategy('CAB', formData, context);
console.log(JSON.stringify(payload, null, 2));
