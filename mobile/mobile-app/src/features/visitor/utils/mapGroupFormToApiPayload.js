"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapGroupFormToApiPayload = void 0;
var mapServiceFormToApiPayload_1 = require("./mapServiceFormToApiPayload");
var mapGroupFormToApiPayload = function (details, guests, context) {
    if (context === void 0) { context = {}; }
    var now = new Date();
    var startDateObj = now;
    if (details.visitDate && details.visitDate.trim() !== '') {
        var parsedDate = new Date(details.visitDate);
        if (!isNaN(parsedDate.getTime())) {
            startDateObj = parsedDate;
        }
    }
    var startDate = new Date(startDateObj);
    startDate.setHours(0, 0, 0, 0);
    var endDate = new Date(startDateObj);
    endDate.setHours(23, 59, 59, 999);
    var formattedGuests = guests.map(function (g) { return ({
        name: g.name.trim(),
        phone: g.phone && g.phone.trim() !== '' ? g.phone.trim() : undefined,
    }); });
    var passCount = parseInt(details.numberOfPasses || '', 10);
    var maxUses = !isNaN(passCount) && passCount > 0 ? passCount : Math.max(guests.length, 10);
    var countNote = "".concat(maxUses, " Total Passes");
    var purposeNote = details.purpose
        ? "".concat(details.purpose.trim(), " (").concat(guests.length > 0 ? "".concat(guests.length, " Named Guests, ") : '').concat(countNote, ")")
        : "Group Event: ".concat(details.eventTitle.trim(), " (").concat(countNote, ")");
    var validityObj = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
    };
    if (details.startTime && details.startTime.trim() !== '') {
        validityObj.timeWindowStart = (0, mapServiceFormToApiPayload_1.convert12To24Time)(details.startTime);
    }
    if (details.endTime && details.endTime.trim() !== '') {
        validityObj.timeWindowEnd = (0, mapServiceFormToApiPayload_1.convert12To24Time)(details.endTime);
    }
    var payload = {
        passType: 'GUEST',
        isGroupPass: true,
        visitorDetails: {
            name: details.eventTitle.trim(),
        },
        purpose: purposeNote,
        groupGuests: formattedGuests,
        validity: validityObj,
        usageLimit: {
            maxUses: maxUses,
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
exports.mapGroupFormToApiPayload = mapGroupFormToApiPayload;
