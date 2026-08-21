"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mapFormToApiPayloadStrategy_1 = require("./src/features/visitor/utils/mapFormToApiPayloadStrategy");
var formData = {
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
var payload = (0, mapFormToApiPayloadStrategy_1.mapFormToApiPayloadStrategy)('DELIVERY', formData, { orgId: 'org1', role: 'RESIDENT' });
console.log(JSON.stringify(payload, null, 2));
