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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceCheckoutAdminVisitor = exports.forceRevokeAdminPass = exports.removeBlacklistEntry = exports.addBlacklistEntry = exports.fetchBlacklist = exports.fetchAdminAnalytics = exports.fetchCommunityPasses = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var visitorAdminService_1 = require("../services/visitorAdminService");
exports.fetchCommunityPasses = (0, toolkit_1.createAsyncThunk)('visitorPass/fetchCommunityPasses', function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var page, limit, skip, queryParams, response, body, innerData, dataArray, totalRecords, error_1;
    var _e, _f;
    var orgId = _c.orgId, params = _c.params;
    var rejectWithValue = _d.rejectWithValue;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 2, , 3]);
                page = (params === null || params === void 0 ? void 0 : params.page) || 1;
                limit = (params === null || params === void 0 ? void 0 : params.limit) || 10;
                skip = (page - 1) * limit;
                queryParams = __assign(__assign({}, params), { skip: skip, limit: limit });
                return [4 /*yield*/, visitorAdminService_1.default.getCommunityPasses(orgId, queryParams)];
            case 1:
                response = _g.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                innerData = (body === null || body === void 0 ? void 0 : body.data) || body;
                dataArray = Array.isArray(innerData) ? innerData : (innerData === null || innerData === void 0 ? void 0 : innerData.data) || [];
                totalRecords = typeof (innerData === null || innerData === void 0 ? void 0 : innerData.totalRecords) === 'number' ? innerData.totalRecords : dataArray.length;
                return [2 /*return*/, {
                        data: dataArray,
                        totalRecords: totalRecords,
                        page: page,
                        limit: limit,
                        append: Boolean(params === null || params === void 0 ? void 0 : params.append),
                    }];
            case 2:
                error_1 = _g.sent();
                return [2 /*return*/, rejectWithValue(((_f = (_e = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || 'Failed to fetch community passes')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.fetchAdminAnalytics = (0, toolkit_1.createAsyncThunk)('visitorPass/fetchAdminAnalytics', function (orgId_1, _a) { return __awaiter(void 0, [orgId_1, _a], void 0, function (orgId, _b) {
    var response, body, error_2;
    var _c, _d;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorAdminService_1.default.getGateAnalytics(orgId)];
            case 1:
                response = _e.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                return [2 /*return*/, ((body === null || body === void 0 ? void 0 : body.data) || body)];
            case 2:
                error_2 = _e.sent();
                return [2 /*return*/, rejectWithValue(((_d = (_c = error_2 === null || error_2 === void 0 ? void 0 : error_2.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || 'Failed to fetch gate analytics')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.fetchBlacklist = (0, toolkit_1.createAsyncThunk)('visitorPass/fetchBlacklist', function (orgId_1, _a) { return __awaiter(void 0, [orgId_1, _a], void 0, function (orgId, _b) {
    var response, body, data, error_3;
    var _c, _d;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorAdminService_1.default.getBlacklist(orgId)];
            case 1:
                response = _e.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                data = Array.isArray((body === null || body === void 0 ? void 0 : body.data) || body) ? (body === null || body === void 0 ? void 0 : body.data) || body : [];
                return [2 /*return*/, data];
            case 2:
                error_3 = _e.sent();
                return [2 /*return*/, rejectWithValue(((_d = (_c = error_3 === null || error_3 === void 0 ? void 0 : error_3.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (error_3 === null || error_3 === void 0 ? void 0 : error_3.message) || 'Failed to fetch blacklist')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.addBlacklistEntry = (0, toolkit_1.createAsyncThunk)('visitorPass/addBlacklistEntry', function (payload_1, _a) { return __awaiter(void 0, [payload_1, _a], void 0, function (payload, _b) {
    var response, body, error_4;
    var _c, _d;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorAdminService_1.default.addToBlacklist(payload)];
            case 1:
                response = _e.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                return [2 /*return*/, (body === null || body === void 0 ? void 0 : body.data) || body];
            case 2:
                error_4 = _e.sent();
                return [2 /*return*/, rejectWithValue(((_d = (_c = error_4 === null || error_4 === void 0 ? void 0 : error_4.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (error_4 === null || error_4 === void 0 ? void 0 : error_4.message) || 'Failed to add to blacklist')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.removeBlacklistEntry = (0, toolkit_1.createAsyncThunk)('visitorPass/removeBlacklistEntry', function (id_1, _a) { return __awaiter(void 0, [id_1, _a], void 0, function (id, _b) {
    var error_5;
    var _c, _d;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorAdminService_1.default.removeFromBlacklist(id)];
            case 1:
                _e.sent();
                return [2 /*return*/, id];
            case 2:
                error_5 = _e.sent();
                return [2 /*return*/, rejectWithValue(((_d = (_c = error_5 === null || error_5 === void 0 ? void 0 : error_5.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (error_5 === null || error_5 === void 0 ? void 0 : error_5.message) || 'Failed to remove from blacklist')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.forceRevokeAdminPass = (0, toolkit_1.createAsyncThunk)('visitorPass/forceRevokeAdminPass', function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var response, body, error_6;
    var _e, _f;
    var id = _c.id, reason = _c.reason;
    var rejectWithValue = _d.rejectWithValue;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorAdminService_1.default.forceRevokePass(id, reason)];
            case 1:
                response = _g.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                return [2 /*return*/, (body === null || body === void 0 ? void 0 : body.data) || body || { id: id, status: 'REVOKED' }];
            case 2:
                error_6 = _g.sent();
                return [2 /*return*/, rejectWithValue(((_f = (_e = error_6 === null || error_6 === void 0 ? void 0 : error_6.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || (error_6 === null || error_6 === void 0 ? void 0 : error_6.message) || 'Failed to force revoke pass')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.forceCheckoutAdminVisitor = (0, toolkit_1.createAsyncThunk)('visitorPass/forceCheckoutAdminVisitor', function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var response, body, error_7;
    var _e, _f;
    var logId = _c.logId, reason = _c.reason;
    var rejectWithValue = _d.rejectWithValue;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorAdminService_1.default.forceCheckoutVisitor(logId, reason)];
            case 1:
                response = _g.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                return [2 /*return*/, (body === null || body === void 0 ? void 0 : body.data) || body || { logId: logId }];
            case 2:
                error_7 = _g.sent();
                return [2 /*return*/, rejectWithValue(((_f = (_e = error_7 === null || error_7 === void 0 ? void 0 : error_7.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || (error_7 === null || error_7 === void 0 ? void 0 : error_7.message) || 'Failed to force checkout visitor')];
            case 3: return [2 /*return*/];
        }
    });
}); });
