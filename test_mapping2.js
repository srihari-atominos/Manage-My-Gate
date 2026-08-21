function mapCabFormToApiPayload(
  provider,
  vehicle,
  schedule,
  context = {},
  customProviderName
) {
  const now = new Date();
  const isMultiUse = schedule.usageType === 'MULTI_USE';

  let startDate = new Date(now);
  let endDate = new Date(now);
  let allowedDays = undefined;
  let timeWindows = undefined;

  const rawVendor =
    provider === 'other' && customProviderName && customProviderName.trim()
      ? customProviderName.trim()
      : provider;

  const vendorName = (rawVendor || 'CAB').toUpperCase();
  const vehicleType = (vehicle.vehicleType || 'CAB').toUpperCase();
  const visitorName = `${vendorName} Driver`;

  const purpose = isMultiUse
    ? `${vehicleType} Multi-Use Pre-Approval via ${vendorName} (Days/wk)`
    : `${vehicleType} Pre-Approval via ${vendorName}`;

  const payload = {
    passType: 'CAB',
    visitorDetails: {
      name: visitorName,
      phone: vehicle.driverPhone && vehicle.driverPhone.trim() !== '' ? vehicle.driverPhone.trim() : undefined,
    },
    vehicleDetails: {
      vendor: vendorName,
      number: vehicle.vehicleNo ? vehicle.vehicleNo.trim().toUpperCase() : 'UNKNOWN',
      vehicleType: vehicleType,
    },
    purpose,
  };

  return payload;
}

const p1 = mapCabFormToApiPayload('other', {vehicleType: 'CAB'}, {usageType: 'ONE_TIME'}, {}, 'Kavya Custom');
console.log(p1);

const p2 = mapCabFormToApiPayload('uber', {vehicleType: 'CAB'}, {usageType: 'ONE_TIME'}, {}, '');
console.log(p2);
