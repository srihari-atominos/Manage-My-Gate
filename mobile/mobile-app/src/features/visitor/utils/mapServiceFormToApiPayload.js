"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapServiceFormToApiPayload = exports.convert12To24Time = void 0;
var WEEKDAY_MAP = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
};
var convert12To24Time = function (timeStr) {
    if (!timeStr || !timeStr.trim())
        return '08:00';
    var clean = timeStr.trim();
    // If already valid 24-hr format (e.g. "08:00" or "13:00")
    if (/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(clean)) {
        return clean;
    }
    var match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
    if (!match)
        return '08:00';
    var hours = parseInt(match[1], 10);
    var minutes = match[2];
    var modifier = match[3] ? match[3].toUpperCase() : null;
    if (modifier === 'PM' && hours < 12) {
        hours += 12;
    }
    else if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }
    var hStr = String(hours).padStart(2, '0');
    return "".concat(hStr, ":").concat(minutes);
};
exports.convert12To24Time = convert12To24Time;
var mapServiceFormToApiPayload = function (staff, category, dateRange, weekdays, timeWindow, context) {
    if (context === void 0) { context = {}; }
    var startDateObj = new Date();
    if (dateRange.startDate && dateRange.startDate.trim() !== '') {
        var parsed = new Date(dateRange.startDate);
        if (!isNaN(parsed.getTime()))
            startDateObj = parsed;
    }
    var startDate = new Date(startDateObj);
    startDate.setHours(0, 0, 0, 0);
    var endDateObj = new Date(startDateObj.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days fallback
    if (dateRange.endDate && dateRange.endDate.trim() !== '') {
        var parsed = new Date(dateRange.endDate);
        if (!isNaN(parsed.getTime()))
            endDateObj = parsed;
    }
    var endDate = new Date(endDateObj);
    endDate.setHours(23, 59, 59, 999);
    var allowedDays = weekdays
        .map(function (d) { return WEEKDAY_MAP[d.toUpperCase()]; })
        .filter(function (n) { return n !== undefined; })
        .sort(function (a, b) { return a - b; });
    var timeWindowStart = (0, exports.convert12To24Time)(timeWindow.startTime);
    var timeWindowEnd = (0, exports.convert12To24Time)(timeWindow.endTime);
    var serviceCategoryLabel = (category || 'Staff').toUpperCase();
    var staffName = staff.staffName.trim();
    var isIdProofPass = !!staff.isIdProofPass;
    var purpose = "".concat(serviceCategoryLabel, " - ").concat(staffName, " (").concat(allowedDays.length, " Days/wk | ").concat(timeWindowStart, "-").concat(timeWindowEnd, ")");
    var payload = {
        passType: 'SERVICE',
        isIdProofPass: isIdProofPass,
        visitorDetails: {
            name: staffName,
            phone: staff.phone && staff.phone.trim() !== '' ? staff.phone.trim() : undefined,
            idProofType: isIdProofPass ? (staff.idProofType || 'Aadhaar Card') : undefined,
            idProofNumber: isIdProofPass && staff.idProofNumber ? staff.idProofNumber.trim() : undefined,
        },
        serviceDetails: {
            category: serviceCategoryLabel,
            notes: staff.notes && staff.notes.trim() !== '' ? staff.notes.trim() : undefined,
        },
        purpose: purpose,
        validity: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            timeWindowStart: timeWindowStart,
            timeWindowEnd: timeWindowEnd,
            allowedDays: allowedDays.length > 0 ? allowedDays : [1, 2, 3, 4, 5],
        },
        usageLimit: {
            maxUses: 999, // Recurring staff pass
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
exports.mapServiceFormToApiPayload = mapServiceFormToApiPayload;
