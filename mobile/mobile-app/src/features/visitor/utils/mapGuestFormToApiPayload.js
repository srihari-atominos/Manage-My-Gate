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
exports.mapGuestFormToApiPayload = void 0;
var mapGuestFormToApiPayload = function (details, schedule, options, context) {
    if (context === void 0) { context = {}; }
    var now = new Date();
    var startDateObj = now;
    if (schedule.visitDate && schedule.visitDate.trim() !== '') {
        var parsedDate = new Date(schedule.visitDate);
        if (!isNaN(parsedDate.getTime())) {
            startDateObj = parsedDate;
        }
    }
    // Set start date to beginning of day
    var startDate = new Date(startDateObj);
    startDate.setHours(0, 0, 0, 0);
    // Set end date to end of day
    var endDate = new Date(startDateObj);
    endDate.setHours(23, 59, 59, 999);
    var timeWindowStart = undefined;
    var timeWindowEnd = undefined;
    var convertTo24 = function (t, defaultVal) {
        if (defaultVal === void 0) { defaultVal = '08:00'; }
        if (!t || !t.trim())
            return defaultVal;
        var clean = t.trim();
        if (/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(clean))
            return clean;
        var match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
        if (!match)
            return defaultVal;
        var hours = parseInt(match[1], 10);
        var minutes = match[2];
        var modifier = match[3] ? match[3].toUpperCase() : null;
        if (modifier === 'PM' && hours < 12)
            hours += 12;
        else if (modifier === 'AM' && hours === 12)
            hours = 0;
        return "".concat(String(hours).padStart(2, '0'), ":").concat(minutes);
    };
    if (schedule.timeSlot === 'TODAY_EVENING') {
        timeWindowStart = '17:00';
        timeWindowEnd = '23:00';
    }
    else if (schedule.timeSlot === 'TOMORROW') {
        timeWindowStart = '08:00';
        timeWindowEnd = '22:00';
    }
    else if (schedule.timeSlot === 'CUSTOM') {
        timeWindowStart = convertTo24(schedule.customStartTime, '14:00');
        timeWindowEnd = convertTo24(schedule.customEndTime, '18:00');
    }
    // Combine purpose and gate instructions into single string if present
    var purposeParts = [];
    if (details.purpose && details.purpose.trim()) {
        purposeParts.push(details.purpose.trim());
    }
    if (options.gateInstructions && options.gateInstructions.trim()) {
        purposeParts.push("Instructions: ".concat(options.gateInstructions.trim()));
    }
    var purpose = purposeParts.length > 0 ? purposeParts.join(' | ') : undefined;
    var isIdProofPass = !!options.isIdProofPass;
    var payload = {
        passType: 'GUEST',
        isIdProofPass: isIdProofPass,
        visitorDetails: {
            name: details.visitorName.trim(),
            phone: details.phone ? details.phone.trim() : undefined,
            idProofType: isIdProofPass ? (options.idProofType || 'Aadhaar Card') : undefined,
            idProofNumber: isIdProofPass && options.idProofNumber ? options.idProofNumber.trim() : undefined,
        },
        purpose: purpose,
        validity: __assign(__assign({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }, (timeWindowStart ? { timeWindowStart: timeWindowStart } : {})), (timeWindowEnd ? { timeWindowEnd: timeWindowEnd } : {})),
        usageLimit: {
            maxUses: options.entryMode === 'SINGLE' ? 1 : 99,
        },
    };
    if (options.vehicleNo && options.vehicleNo.trim()) {
        payload.vehicleDetails = {
            number: options.vehicleNo.trim().toUpperCase(),
        };
    }
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
exports.mapGuestFormToApiPayload = mapGuestFormToApiPayload;
