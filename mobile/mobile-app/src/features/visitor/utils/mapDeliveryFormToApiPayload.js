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
exports.mapDeliveryFormToApiPayload = void 0;
var WEEKDAY_MAP = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
};
var convertTo24Hr = function (timeStr) {
    if (!timeStr || !timeStr.trim())
        return '08:00';
    var clean = timeStr.trim();
    if (/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(clean))
        return clean;
    var match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
    if (!match)
        return '08:00';
    var hours = parseInt(match[1], 10);
    var minutes = match[2];
    var modifier = match[3] ? match[3].toUpperCase() : null;
    if (modifier === 'PM' && hours < 12)
        hours += 12;
    else if (modifier === 'AM' && hours === 12)
        hours = 0;
    return "".concat(String(hours).padStart(2, '0'), ":").concat(minutes);
};
var mapDeliveryFormToApiPayload = function (partner, details, validity, context, customPartnerName) {
    if (context === void 0) { context = {}; }
    var now = new Date();
    var isMultiUse = validity.usageType === 'MULTI_USE';
    var startDate = new Date(now);
    var endDate = new Date(now);
    var allowedDays = undefined;
    var timeWindows = undefined;
    if (isMultiUse) {
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default
        endDate.setHours(23, 59, 59, 999);
        var mapped = (validity.selectedWeekdays || [])
            .map(function (d) { return WEEKDAY_MAP[d.toUpperCase()]; })
            .filter(function (n) { return n !== undefined; })
            .sort(function (a, b) { return a - b; });
        allowedDays = mapped.length > 0 ? mapped : [0, 1, 2, 3, 4, 5, 6];
        if (Array.isArray(validity.timeSlots) && validity.timeSlots.length > 0) {
            timeWindows = validity.timeSlots.map(function (ts) { return ({
                start: convertTo24Hr(ts.startTime),
                end: convertTo24Hr(ts.endTime),
            }); });
        }
    }
    else {
        if (validity.validityDuration === 'ONE_HOUR') {
            endDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
        }
        else if (validity.validityDuration === 'TWO_HOURS') {
            endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
        }
        else if (validity.validityDuration === 'END_OF_DAY') {
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        else if (validity.validityDuration === 'CUSTOM') {
            var visitDateStr = validity.customVisitDate && validity.customVisitDate.trim()
                ? validity.customVisitDate.trim()
                : now.toISOString().split('T')[0];
            var start24 = convertTo24Hr(validity.customStartTime || '02:00 PM');
            var end24 = convertTo24Hr(validity.customEndTime || '06:00 PM');
            var _a = start24.split(':').map(Number), sHours = _a[0], sMins = _a[1];
            var _b = end24.split(':').map(Number), eHours = _b[0], eMins = _b[1];
            startDate = new Date(visitDateStr);
            if (isNaN(startDate.getTime()))
                startDate = new Date(now);
            startDate.setHours(sHours || 0, sMins || 0, 0, 0);
            endDate = new Date(visitDateStr);
            if (isNaN(endDate.getTime()))
                endDate = new Date(now);
            endDate.setHours(eHours || 23, eMins || 59, 59, 999);
            timeWindows = [{ start: start24, end: end24 }];
        }
    }
    var rawPartner = partner === 'other' && customPartnerName && customPartnerName.trim()
        ? customPartnerName.trim()
        : partner;
    var partnerName = (rawPartner || 'DELIVERY').toUpperCase();
    var visitorName = "".concat(partnerName, " Delivery Agent");
    var parsedCount = parseInt(details.packageCount, 10);
    var packageCount = !isNaN(parsedCount) && parsedCount > 0 ? parsedCount : 1;
    var isLeaveAtGate = details.deliveryAction === 'LEAVE_AT_GATE';
    var actionLabel = isLeaveAtGate ? 'Leave at Gate' : 'Doorstep Delivery';
    var orderRef = details.orderId && details.orderId.trim() !== '' ? "Order ".concat(details.orderId.trim()) : 'Parcel Delivery';
    var purpose = isMultiUse
        ? "Recurring Delivery Pre-Approval via ".concat(partnerName, " (").concat((allowedDays || []).length, " Days/wk)")
        : "".concat(orderRef, " (").concat(packageCount, " Pkg) | ").concat(actionLabel);
    var payload = {
        passType: 'DELIVERY',
        isPrivate: isLeaveAtGate,
        visitorDetails: {
            name: visitorName,
        },
        deliveryDetails: {
            partner: partnerName,
            orderId: details.orderId && details.orderId.trim() !== '' ? details.orderId.trim() : undefined,
            packageCount: packageCount,
            deliveryAction: details.deliveryAction || 'DOORSTEP',
            instructions: details.instructions && details.instructions.trim() !== '' ? details.instructions.trim() : undefined,
        },
        purpose: purpose,
        validity: __assign(__assign({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }, (allowedDays ? { allowedDays: allowedDays } : {})), (timeWindows ? { timeWindows: timeWindows } : {})),
        usageLimit: {
            maxUses: isMultiUse ? 100 : 1,
        },
    };
    if (context.orgId) {
        payload.orgId = context.orgId;
    }
    if (context.createdById) {
        payload.createdById = context.createdById;
    }
    if (context.villaId) {
        payload.villaId = context.villaId;
    }
    if (context.roleId) {
        payload.roleId = context.roleId;
    }
    return payload;
};
exports.mapDeliveryFormToApiPayload = mapDeliveryFormToApiPayload;
