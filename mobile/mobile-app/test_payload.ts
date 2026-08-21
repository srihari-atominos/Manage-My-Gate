import { mapFormToApiPayloadStrategy } from './src/features/visitor/utils/mapFormToApiPayloadStrategy';

const formData = {
  deliveryPartner: 'other',
  customDeliveryPartner: 'Kavya Foods',
  deliveryDetails: {
    packageCount: '3',
    deliveryAction: 'LEAVE_AT_GATE',
    orderId: '123',
    instructions: 'Ring bell',
  },
  deliveryValidity: {
    usageType: 'SINGLE',
    validityDuration: '1_HOUR',
  }
};

const payload = mapFormToApiPayloadStrategy('DELIVERY', formData, { orgId: 'org1', role: 'RESIDENT' });
console.log(JSON.stringify(payload, null, 2));
