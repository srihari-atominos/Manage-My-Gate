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
exports.mapCabFormToApiPayload = void 0;
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
var mapCabFormToApiPayload = function (provider, vehicle, schedule, context, customProviderName) {
    if (context === void 0) { context = {}; }
    var now = new Date();
    var isMultiUse = schedule.usageType === 'MULTI_USE';
    var startDate = new Date(now);
    var endDate = new Date(now);
    var allowedDays = undefined;
    var timeWindows = undefined;
    if (isMultiUse) {
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default
        endDate.setHours(23, 59, 59, 999);
        var mapped = (schedule.selectedWeekdays || [])
            .map(function (d) { return WEEKDAY_MAP[d.toUpperCase()]; })
            .filter(function (n) { return n !== undefined; })
            .sort(function (a, b) { return a - b; });
        allowedDays = mapped.length > 0 ? mapped : [1, 2, 3, 4, 5];
        if (Array.isArray(schedule.timeSlots) && schedule.timeSlots.length > 0) {
            timeWindows = schedule.timeSlots.map(function (ts) { return ({
                start: convertTo24Hr(ts.startTime),
                end: convertTo24Hr(ts.endTime),
            }); });
        }
    }
    else {
        if (schedule.arrivalWindow === 'IMMEDIATE') {
            endDate = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins
        }
        else if (schedule.arrivalWindow === 'THIRTY_MINS') {
            endDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
        }
        else if (schedule.arrivalWindow === 'ONE_HOUR') {
            endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
        }
        else if (schedule.arrivalWindow === 'TODAY_LATER') {
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        else if (schedule.arrivalWindow === 'CUSTOM') {
            var visitDateStr = schedule.customVisitDate && schedule.customVisitDate.trim()
                ? schedule.customVisitDate.trim()
                : now.toISOString().split('T')[0];
            var baseDate = new Date(visitDateStr);
            if (schedule.customStartTime) {
                var _a = convertTo24Hr(schedule.customStartTime).split(':'), h = _a[0], m = _a[1];
                startDate = new Date(baseDate);
                startDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
            }
            if (schedule.customEndTime) {
                var _b = convertTo24Hr(schedule.customEndTime).split(':'), h = _b[0], m = _b[1];
                endDate = new Date(baseDate);
                endDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
            }
            else {
                endDate = new Date(startDate.getTime() + 2 * 60 * 60000); // 2 hrs default
            }
        }
    }
    var rawVendor = provider === 'other' && customProviderName && customProviderName.trim()
        ? customProviderName.trim()
        : provider;
    var vendorName = (rawVendor || 'CAB').toUpperCase();
    var vehicleType = (vehicle.vehicleType || 'CAB').toUpperCase();
    var visitorName = "".concat(vendorName, " Driver");
    var purpose = isMultiUse
        ? "".concat(vehicleType, " Multi-Use Pre-Approval via ").concat(vendorName, " (").concat((allowedDays || []).length, " Days/wk)")
        : "".concat(vehicleType, " Pre-Approval via ").concat(vendorName);
    var payload = {
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
exports.mapCabFormToApiPayload = mapCabFormToApiPayload;
