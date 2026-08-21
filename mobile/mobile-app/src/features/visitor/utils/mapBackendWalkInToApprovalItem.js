"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapBackendWalkInToApprovalItem = void 0;
/**
 * Pure mapper function converting raw backend VisitorLog objects (WALK_IN)
 * into normalized WalkInApprovalItem objects for resident approval UI rendering.
 */
var mapBackendWalkInToApprovalItem = function (log) {
    var _a, _b, _c, _d, _e;
    if (!log) {
        return {};
    }
    var id = log._id || String(Math.random());
    var visitorName = ((_a = log.snapshot) === null || _a === void 0 ? void 0 : _a.visitorName) || 'Walk-In Visitor';
    // Do NOT fabricate or substitute idProofNumber as phone number.
    // Extract phone only if explicit phone field exists in backend payload/snapshot.
    var phone = ((_b = log.snapshot) === null || _b === void 0 ? void 0 : _b.phone) || log.phone || '';
    var vehicleNo = ((_c = log.snapshot) === null || _c === void 0 ? void 0 : _c.vehicleNumber) || undefined;
    var idProof = (_d = log.snapshot) === null || _d === void 0 ? void 0 : _d.idProofNumber;
    var notes = idProof ? "ID Proof: ".concat(idProof) : undefined;
    // Derived UI fallbacks used ONLY when backend does not provide explicit values
    var gateName = ((_e = log.guardId) === null || _e === void 0 ? void 0 : _e.name) ? "Gate Guard (".concat(log.guardId.name, ")") : 'Security Main Gate';
    var purpose = log.purpose || 'Gate Walk-In Approval Request';
    var passType = log.passType || 'GUEST';
    var createdAtMs = log.createdAt ? new Date(log.createdAt).getTime() : Date.now();
    var waitingDurationMinutes = Math.max(1, Math.floor((Date.now() - createdAtMs) / 60000));
    var status = 'PENDING';
    if (log.logStatus === 'INSIDE' || log.logStatus === 'COMPLETED' || log.logStatus === 'APPROVED') {
        status = 'APPROVED';
    }
    else if (log.logStatus === 'REJECTED') {
        status = 'REJECTED';
    }
    else {
        status = 'PENDING';
    }
    return {
        id: id,
        visitorName: visitorName,
        phone: phone,
        purpose: purpose,
        passType: passType,
        gateName: gateName,
        waitingDurationMinutes: waitingDurationMinutes,
        requestTimestamp: log.createdAt || new Date().toISOString(),
        vehicleNo: vehicleNo,
        notes: notes,
        status: status,
        rawLog: log,
    };
};
exports.mapBackendWalkInToApprovalItem = mapBackendWalkInToApprovalItem;
exports.default = exports.mapBackendWalkInToApprovalItem;
