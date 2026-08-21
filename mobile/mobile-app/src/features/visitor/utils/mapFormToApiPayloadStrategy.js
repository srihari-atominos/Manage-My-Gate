"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapFormToApiPayloadStrategy = void 0;
var mapGuestFormToApiPayload_1 = require("./mapGuestFormToApiPayload");
var mapCabFormToApiPayload_1 = require("./mapCabFormToApiPayload");
var mapDeliveryFormToApiPayload_1 = require("./mapDeliveryFormToApiPayload");
var mapServiceFormToApiPayload_1 = require("./mapServiceFormToApiPayload");
var mapGroupFormToApiPayload_1 = require("./mapGroupFormToApiPayload");
/**
 * Enterprise Pass Payload Strategy Mapper
 * Seamlessly maps wizard form inputs across all pass types (GUEST, CAB, DELIVERY, SERVICE, GROUP)
 * while injecting role context (Resident vs Admin vs Guard) and optional Villa assignment.
 */
var mapFormToApiPayloadStrategy = function (passType, formData, context) {
    var _a;
    var baseContext = {
        orgId: context.orgId,
        createdById: context.createdById,
        villaId: context.villaId || undefined,
        isPrivate: (_a = context.isPrivate) !== null && _a !== void 0 ? _a : false,
        role: context.role,
    };
    switch (passType) {
        case 'GUEST': {
            var payload = (0, mapGuestFormToApiPayload_1.mapGuestFormToApiPayload)(formData.guestDetails, formData.guestSchedule, formData.guestOptions);
            return __assign(__assign(__assign(__assign({}, payload), baseContext), { passType: context.role === 'ADMIN' && !context.villaId ? 'ADMIN_GUEST' : 'GUEST' }), (context.adminNotes ? { adminNotes: context.adminNotes } : {}));
        }
        case 'CAB': {
            var payload = (0, mapCabFormToApiPayload_1.mapCabFormToApiPayload)(formData.cabProvider, formData.cabVehicle, formData.cabSchedule, baseContext, formData.customCabProvider);
            return __assign(__assign(__assign({}, payload), baseContext), { passType: 'CAB' });
        }
        case 'DELIVERY': {
            var payload = (0, mapDeliveryFormToApiPayload_1.mapDeliveryFormToApiPayload)(formData.deliveryPartner, formData.deliveryDetails, formData.deliveryValidity, baseContext, formData.customDeliveryPartner);
            return __assign(__assign(__assign({}, payload), baseContext), { passType: 'DELIVERY' });
        }
        case 'SERVICE': {
            var payload = (0, mapServiceFormToApiPayload_1.mapServiceFormToApiPayload)(formData.staffDetails, formData.serviceCategory, formData.serviceDateRange, formData.serviceWeekdays, formData.serviceTimeWindow);
            return __assign(__assign(__assign({}, payload), baseContext), { passType: 'SERVICE' });
        }
        case 'GROUP': {
            var payload = (0, mapGroupFormToApiPayload_1.mapGroupFormToApiPayload)(formData.groupDetails, formData.groupGuests);
            return __assign(__assign(__assign({}, payload), baseContext), { passType: 'GUEST', isGroupPass: true });
        }
        default:
            throw new Error("Unsupported pass type key: ".concat(passType));
    }
};
exports.mapFormToApiPayloadStrategy = mapFormToApiPayloadStrategy;
exports.default = exports.mapFormToApiPayloadStrategy;
