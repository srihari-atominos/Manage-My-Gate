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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkInResolvedReceived = exports.walkInPendingReceived = exports.setActivePass = exports.clearPassStatus = exports.visitorPassSlice = exports.resolveWalkInRequest = exports.fetchPendingWalkIns = exports.fetchDashboardSummary = exports.getPasses = exports.updatePassStatus = exports.fetchPassByCode = exports.getPassDetails = exports.createPass = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var visitorService_1 = require("../services/visitorService");
var mapBackendWalkInToApprovalItem_1 = require("../utils/mapBackendWalkInToApprovalItem");
var adminVisitorThunks_1 = require("./adminVisitorThunks");
var initialState = {
    passes: [],
    activePass: null,
    dashboard: {
        recentPasses: [],
        activePassesCount: 0,
        pendingWalkIns: [],
        status: 'idle',
        error: null,
    },
    walkIns: {
        pendingList: [],
        status: 'idle',
        actionStatus: 'idle',
        error: null,
    },
    admin: {
        communityPasses: [],
        blacklist: [],
        analytics: null,
        pagination: {
            currentPage: 1,
            totalPages: 1,
            totalRecords: 0,
            limit: 10,
        },
        status: 'idle',
        actionStatus: 'idle',
        error: null,
    },
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        limit: 10,
    },
    status: 'idle',
    actionStatus: 'idle',
    error: null,
};
exports.createPass = (0, toolkit_1.createAsyncThunk)('visitorPass/createPass', function (payload_1, _a) { return __awaiter(void 0, [payload_1, _a], void 0, function (payload, _b) {
    var response, body, error_1;
    var _c, _d;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorService_1.default.createPass(payload)];
            case 1:
                response = _e.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                return [2 /*return*/, ((body === null || body === void 0 ? void 0 : body.data) || body)];
            case 2:
                error_1 = _e.sent();
                return [2 /*return*/, rejectWithValue(((_d = (_c = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || 'Failed to create visitor pass')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.getPassDetails = (0, toolkit_1.createAsyncThunk)('visitorPass/getPassDetails', function (id_1, _a) { return __awaiter(void 0, [id_1, _a], void 0, function (id, _b) {
    var response, body, error_2;
    var _c, _d;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorService_1.default.getPassDetails(id)];
            case 1:
                response = _e.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                return [2 /*return*/, ((body === null || body === void 0 ? void 0 : body.data) || body)];
            case 2:
                error_2 = _e.sent();
                return [2 /*return*/, rejectWithValue(((_d = (_c = error_2 === null || error_2 === void 0 ? void 0 : error_2.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || 'Failed to fetch pass details')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.fetchPassByCode = (0, toolkit_1.createAsyncThunk)('visitorPass/fetchPassByCode', function (code_1, _a) { return __awaiter(void 0, [code_1, _a], void 0, function (code, _b) {
    var response, body, error_3;
    var _c, _d;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorService_1.default.getPassByCode(code)];
            case 1:
                response = _e.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                return [2 /*return*/, ((body === null || body === void 0 ? void 0 : body.data) || body)];
            case 2:
                error_3 = _e.sent();
                return [2 /*return*/, rejectWithValue(((_d = (_c = error_3 === null || error_3 === void 0 ? void 0 : error_3.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (error_3 === null || error_3 === void 0 ? void 0 : error_3.message) || 'Failed to fetch pass details by key code')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.updatePassStatus = (0, toolkit_1.createAsyncThunk)('visitorPass/updatePassStatus', function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var response, body, error_4;
    var _e, _f;
    var id = _c.id, status = _c.status;
    var rejectWithValue = _d.rejectWithValue;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorService_1.default.updatePassStatus(id, status)];
            case 1:
                response = _g.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                return [2 /*return*/, ((body === null || body === void 0 ? void 0 : body.data) || body)];
            case 2:
                error_4 = _g.sent();
                return [2 /*return*/, rejectWithValue(((_f = (_e = error_4 === null || error_4 === void 0 ? void 0 : error_4.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || (error_4 === null || error_4 === void 0 ? void 0 : error_4.message) || 'Failed to update pass status')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.getPasses = (0, toolkit_1.createAsyncThunk)('visitorPass/getPasses', function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var page, limit, skip, queryParams, response, body, innerData, dataArray, totalRecords, error_5;
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
                queryParams = { skip: skip, limit: limit };
                if (params === null || params === void 0 ? void 0 : params.statuses) {
                    queryParams.statuses = params.statuses;
                }
                return [4 /*yield*/, visitorService_1.default.getPasses(orgId, queryParams)];
            case 1:
                response = _g.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                innerData = (body === null || body === void 0 ? void 0 : body.data) || body;
                dataArray = (Array.isArray(innerData) ? innerData : ((innerData === null || innerData === void 0 ? void 0 : innerData.data) || []));
                totalRecords = typeof (innerData === null || innerData === void 0 ? void 0 : innerData.totalRecords) === 'number' ? innerData.totalRecords : dataArray.length;
                return [2 /*return*/, {
                        data: dataArray,
                        totalRecords: totalRecords,
                        page: page,
                        limit: limit,
                        append: Boolean(params === null || params === void 0 ? void 0 : params.append),
                    }];
            case 2:
                error_5 = _g.sent();
                return [2 /*return*/, rejectWithValue(((_f = (_e = error_5 === null || error_5 === void 0 ? void 0 : error_5.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || (error_5 === null || error_5 === void 0 ? void 0 : error_5.message) || 'Failed to fetch passes')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.fetchDashboardSummary = (0, toolkit_1.createAsyncThunk)('visitorPass/fetchDashboardSummary', function (orgId_1, _a) { return __awaiter(void 0, [orgId_1, _a], void 0, function (orgId, _b) {
    var _c, passesRes, pendingLogsRes, passesBody, passesInner, recentPasses, activePassesCount, logsBody, pendingWalkIns, error_6;
    var _d, _e;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Promise.all([
                        visitorService_1.default.getPasses(orgId, { skip: 0, limit: 5, statuses: 'ACTIVE,PENDING' }),
                        visitorService_1.default.getPendingApprovals(orgId),
                    ])];
            case 1:
                _c = _f.sent(), passesRes = _c[0], pendingLogsRes = _c[1];
                passesBody = passesRes && passesRes.success !== undefined ? passesRes : passesRes === null || passesRes === void 0 ? void 0 : passesRes.data;
                passesInner = (passesBody === null || passesBody === void 0 ? void 0 : passesBody.data) || passesBody;
                recentPasses = (Array.isArray(passesInner) ? passesInner : ((passesInner === null || passesInner === void 0 ? void 0 : passesInner.data) || []));
                activePassesCount = typeof (passesInner === null || passesInner === void 0 ? void 0 : passesInner.totalRecords) === 'number' ? passesInner.totalRecords : recentPasses.length;
                logsBody = pendingLogsRes && pendingLogsRes.success !== undefined ? pendingLogsRes : pendingLogsRes === null || pendingLogsRes === void 0 ? void 0 : pendingLogsRes.data;
                pendingWalkIns = Array.isArray((logsBody === null || logsBody === void 0 ? void 0 : logsBody.data) || logsBody) ? ((logsBody === null || logsBody === void 0 ? void 0 : logsBody.data) || logsBody) : Array.isArray(logsBody) ? logsBody : [];
                return [2 /*return*/, {
                        recentPasses: recentPasses,
                        activePassesCount: activePassesCount,
                        pendingWalkIns: pendingWalkIns,
                    }];
            case 2:
                error_6 = _f.sent();
                return [2 /*return*/, rejectWithValue(((_e = (_d = error_6 === null || error_6 === void 0 ? void 0 : error_6.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || (error_6 === null || error_6 === void 0 ? void 0 : error_6.message) || 'Failed to fetch dashboard summary')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.fetchPendingWalkIns = (0, toolkit_1.createAsyncThunk)('visitorPass/fetchPendingWalkIns', function (orgId_1, _a) { return __awaiter(void 0, [orgId_1, _a], void 0, function (orgId, _b) {
    var response, body, logs, mapped, error_7;
    var _c, _d;
    var rejectWithValue = _b.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorService_1.default.getPendingApprovals(orgId)];
            case 1:
                response = _e.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                logs = Array.isArray((body === null || body === void 0 ? void 0 : body.data) || body) ? ((body === null || body === void 0 ? void 0 : body.data) || body) : Array.isArray(body) ? body : [];
                mapped = logs.map(function (log) { return (0, mapBackendWalkInToApprovalItem_1.mapBackendWalkInToApprovalItem)(log); });
                return [2 /*return*/, {
                        mapped: mapped,
                        rawLogs: logs,
                    }];
            case 2:
                error_7 = _e.sent();
                return [2 /*return*/, rejectWithValue(((_d = (_c = error_7 === null || error_7 === void 0 ? void 0 : error_7.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || (error_7 === null || error_7 === void 0 ? void 0 : error_7.message) || 'Failed to fetch pending walk-ins')];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.resolveWalkInRequest = (0, toolkit_1.createAsyncThunk)('visitorPass/resolveWalkInRequest', function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var response, body, data, error_8;
    var id = _c.id, action = _c.action;
    var rejectWithValue = _d.rejectWithValue;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                return [4 /*yield*/, visitorService_1.default.resolveWalkIn(id, action)];
            case 1:
                response = _e.sent();
                body = response && response.success !== undefined ? response : response === null || response === void 0 ? void 0 : response.data;
                data = (body === null || body === void 0 ? void 0 : body.data) || body;
                return [2 /*return*/, { id: id, action: action, data: data }];
            case 2:
                error_8 = _e.sent();
                return [2 /*return*/, rejectWithValue(error_8.message || "Failed to resolve walk-in request as ".concat(action))];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.visitorPassSlice = (0, toolkit_1.createSlice)({
    name: 'visitorPass',
    initialState: initialState,
    reducers: {
        clearPassStatus: function (state) {
            state.status = 'idle';
            state.actionStatus = 'idle';
            state.error = null;
            state.walkIns.actionStatus = 'idle';
            state.walkIns.error = null;
        },
        setActivePass: function (state, action) {
            state.activePass = action.payload;
        },
        walkInPendingReceived: function (state, action) {
            var _a = action.payload, mappedItem = _a.mappedItem, rawLog = _a.rawLog;
            var targetId = mappedItem.id || (rawLog === null || rawLog === void 0 ? void 0 : rawLog._id);
            // 1. Update walkIns.pendingList idempotently
            var existingIdx = state.walkIns.pendingList.findIndex(function (item) { return item.id === targetId || (item.rawLog && item.rawLog._id === targetId); });
            if (existingIdx !== -1) {
                state.walkIns.pendingList[existingIdx] = mappedItem;
            }
            else {
                state.walkIns.pendingList.unshift(mappedItem);
            }
            // 2. Update dashboard.pendingWalkIns idempotently
            if (rawLog && rawLog._id) {
                var dashIdx = state.dashboard.pendingWalkIns.findIndex(function (p) { return p._id === rawLog._id || p.id === rawLog._id; });
                if (dashIdx !== -1) {
                    state.dashboard.pendingWalkIns[dashIdx] = rawLog;
                }
                else {
                    state.dashboard.pendingWalkIns.unshift(rawLog);
                }
            }
        },
        walkInResolvedReceived: function (state, action) {
            var targetId = action.payload.id;
            // Idempotent removal from pendingList and pendingWalkIns
            state.walkIns.pendingList = state.walkIns.pendingList.filter(function (item) { var _a; return item.id !== targetId && ((_a = item.rawLog) === null || _a === void 0 ? void 0 : _a._id) !== targetId; });
            state.dashboard.pendingWalkIns = state.dashboard.pendingWalkIns.filter(function (p) { return p._id !== targetId && p.id !== targetId; });
        },
    },
    extraReducers: function (builder) {
        builder
            // getPasses
            .addCase(exports.getPasses.pending, function (state) {
            state.status = 'loading';
            state.error = null;
        })
            .addCase(exports.getPasses.fulfilled, function (state, action) {
            state.status = 'succeeded';
            if (action.payload.append) {
                var existingIds_1 = new Set(state.passes.map(function (p) { return p._id; }));
                var newPasses = (action.payload.data || []).filter(function (p) { return !existingIds_1.has(p._id); });
                state.passes = __spreadArray(__spreadArray([], state.passes, true), newPasses, true);
            }
            else {
                state.passes = action.payload.data || [];
            }
            state.pagination.totalRecords = action.payload.totalRecords || 0;
            state.pagination.limit = action.payload.limit;
            state.pagination.currentPage = action.payload.page;
            state.pagination.totalPages = Math.max(1, Math.ceil((action.payload.totalRecords || 0) / action.payload.limit));
        })
            .addCase(exports.getPasses.rejected, function (state, action) {
            state.status = 'failed';
            state.error = action.payload || 'Failed to fetch passes';
        })
            // fetchDashboardSummary
            .addCase(exports.fetchDashboardSummary.pending, function (state) {
            state.dashboard.status = 'loading';
            state.dashboard.error = null;
        })
            .addCase(exports.fetchDashboardSummary.fulfilled, function (state, action) {
            state.dashboard.status = 'succeeded';
            state.dashboard.recentPasses = action.payload.recentPasses;
            state.dashboard.activePassesCount = action.payload.activePassesCount;
            state.dashboard.pendingWalkIns = action.payload.pendingWalkIns;
        })
            .addCase(exports.fetchDashboardSummary.rejected, function (state, action) {
            state.dashboard.status = 'failed';
            state.dashboard.error = action.payload || 'Failed to fetch dashboard summary';
        })
            // fetchPendingWalkIns
            .addCase(exports.fetchPendingWalkIns.pending, function (state) {
            state.walkIns.status = 'loading';
            state.walkIns.error = null;
        })
            .addCase(exports.fetchPendingWalkIns.fulfilled, function (state, action) {
            state.walkIns.status = 'succeeded';
            state.walkIns.pendingList = action.payload.mapped;
            state.dashboard.pendingWalkIns = action.payload.rawLogs;
        })
            .addCase(exports.fetchPendingWalkIns.rejected, function (state, action) {
            state.walkIns.status = 'failed';
            state.walkIns.error = action.payload || 'Failed to fetch pending walk-ins';
        })
            // resolveWalkInRequest
            .addCase(exports.resolveWalkInRequest.pending, function (state) {
            state.walkIns.actionStatus = 'loading';
            state.walkIns.error = null;
        })
            .addCase(exports.resolveWalkInRequest.fulfilled, function (state, action) {
            state.walkIns.actionStatus = 'succeeded';
            var targetId = action.payload.id;
            state.walkIns.pendingList = state.walkIns.pendingList.filter(function (item) { var _a; return item.id !== targetId && ((_a = item.rawLog) === null || _a === void 0 ? void 0 : _a._id) !== targetId; });
            state.dashboard.pendingWalkIns = state.dashboard.pendingWalkIns.filter(function (p) { return p._id !== targetId && p.id !== targetId; });
        })
            .addCase(exports.resolveWalkInRequest.rejected, function (state, action) {
            state.walkIns.actionStatus = 'failed';
            state.walkIns.error = action.payload || 'Failed to resolve walk-in request';
        })
            // getPassDetails
            .addCase(exports.getPassDetails.pending, function (state) {
            state.status = 'loading';
            state.error = null;
        })
            .addCase(exports.getPassDetails.fulfilled, function (state, action) {
            state.status = 'succeeded';
            state.activePass = action.payload;
            var index = state.passes.findIndex(function (pass) { return pass._id === action.payload._id; });
            if (index !== -1) {
                state.passes[index] = action.payload;
            }
            else {
                state.passes.unshift(action.payload);
            }
        })
            .addCase(exports.getPassDetails.rejected, function (state, action) {
            state.status = 'failed';
            state.error = action.payload || 'Failed to fetch pass details';
        })
            // fetchPassByCode
            .addCase(exports.fetchPassByCode.pending, function (state) {
            state.status = 'loading';
            state.error = null;
        })
            .addCase(exports.fetchPassByCode.fulfilled, function (state, action) {
            state.status = 'succeeded';
            state.activePass = action.payload;
            var index = state.passes.findIndex(function (pass) { return pass._id === action.payload._id; });
            if (index !== -1) {
                state.passes[index] = action.payload;
            }
            else {
                state.passes.unshift(action.payload);
            }
        })
            .addCase(exports.fetchPassByCode.rejected, function (state, action) {
            state.status = 'failed';
            state.error = action.payload || 'Failed to fetch pass details by key code';
        })
            // createPass
            .addCase(exports.createPass.pending, function (state) {
            state.actionStatus = 'loading';
            state.error = null;
        })
            .addCase(exports.createPass.fulfilled, function (state, action) {
            state.actionStatus = 'succeeded';
            state.passes.unshift(action.payload);
            state.activePass = action.payload;
            state.dashboard.recentPasses.unshift(action.payload);
            state.dashboard.activePassesCount += 1;
        })
            .addCase(exports.createPass.rejected, function (state, action) {
            state.actionStatus = 'failed';
            state.error = action.payload || 'Failed to create visitor pass';
        })
            // updatePassStatus
            .addCase(exports.updatePassStatus.pending, function (state) {
            state.actionStatus = 'loading';
            state.error = null;
        })
            .addCase(exports.updatePassStatus.fulfilled, function (state, action) {
            state.actionStatus = 'succeeded';
            var updatedPass = action.payload;
            var targetId = updatedPass._id || updatedPass.id;
            var previousStatus = undefined;
            // 1. Update state.passes
            var index = state.passes.findIndex(function (pass) { return pass._id === targetId || pass.id === targetId; });
            if (index !== -1) {
                previousStatus = state.passes[index].status;
                state.passes[index] = __assign(__assign({}, state.passes[index]), updatedPass);
            }
            // 2. Update state.activePass
            if (state.activePass &&
                (state.activePass._id === targetId || state.activePass.id === targetId)) {
                state.activePass = __assign(__assign({}, state.activePass), updatedPass);
            }
            // 3. Synchronize state.dashboard
            var dashIdx = state.dashboard.recentPasses.findIndex(function (pass) { return pass._id === targetId || pass.id === targetId; });
            if (dashIdx !== -1) {
                previousStatus = previousStatus || state.dashboard.recentPasses[dashIdx].status;
                if (updatedPass.status !== 'ACTIVE') {
                    state.dashboard.recentPasses.splice(dashIdx, 1);
                }
                else {
                    state.dashboard.recentPasses[dashIdx] = __assign(__assign({}, state.dashboard.recentPasses[dashIdx]), updatedPass);
                }
            }
            // Decrement dashboard activePassesCount ONLY IF the pass was previously ACTIVE
            if (previousStatus === 'ACTIVE' && updatedPass.status !== 'ACTIVE') {
                state.dashboard.activePassesCount = Math.max(0, state.dashboard.activePassesCount - 1);
            }
        })
            .addCase(exports.updatePassStatus.rejected, function (state, action) {
            state.actionStatus = 'failed';
            state.error = action.payload || 'Failed to update pass status';
        })
            // Admin fetchCommunityPasses
            .addCase(adminVisitorThunks_1.fetchCommunityPasses.pending, function (state) {
            state.admin.status = 'loading';
            state.admin.error = null;
        })
            .addCase(adminVisitorThunks_1.fetchCommunityPasses.fulfilled, function (state, action) {
            state.admin.status = 'succeeded';
            if (action.payload.append) {
                var existingIds_2 = new Set(state.admin.communityPasses.map(function (p) { return p._id; }));
                var newPasses = (action.payload.data || []).filter(function (p) { return !existingIds_2.has(p._id); });
                state.admin.communityPasses = __spreadArray(__spreadArray([], state.admin.communityPasses, true), newPasses, true);
            }
            else {
                state.admin.communityPasses = action.payload.data || [];
            }
            state.admin.pagination.totalRecords = action.payload.totalRecords || 0;
            state.admin.pagination.limit = action.payload.limit;
            state.admin.pagination.currentPage = action.payload.page;
            state.admin.pagination.totalPages = Math.max(1, Math.ceil((action.payload.totalRecords || 0) / action.payload.limit));
        })
            .addCase(adminVisitorThunks_1.fetchCommunityPasses.rejected, function (state, action) {
            state.admin.status = 'failed';
            state.admin.error = action.payload || 'Failed to fetch community passes';
        })
            // Admin fetchAdminAnalytics
            .addCase(adminVisitorThunks_1.fetchAdminAnalytics.fulfilled, function (state, action) {
            state.admin.analytics = action.payload;
        })
            // Admin fetchBlacklist
            .addCase(adminVisitorThunks_1.fetchBlacklist.fulfilled, function (state, action) {
            state.admin.blacklist = action.payload;
        })
            // Admin addBlacklistEntry
            .addCase(adminVisitorThunks_1.addBlacklistEntry.fulfilled, function (state, action) {
            state.admin.blacklist.unshift(action.payload);
        })
            // Admin removeBlacklistEntry
            .addCase(adminVisitorThunks_1.removeBlacklistEntry.fulfilled, function (state, action) {
            state.admin.blacklist = state.admin.blacklist.filter(function (b) { return b._id !== action.payload; });
        })
            // Admin forceRevokeAdminPass
            .addCase(adminVisitorThunks_1.forceRevokeAdminPass.fulfilled, function (state, action) {
            var targetId = action.payload._id || action.payload.id;
            var idx = state.admin.communityPasses.findIndex(function (p) { return p._id === targetId; });
            if (idx !== -1) {
                state.admin.communityPasses[idx].status = 'REVOKED';
            }
        });
    },
});
exports.clearPassStatus = (_a = exports.visitorPassSlice.actions, _a.clearPassStatus), exports.setActivePass = _a.setActivePass, exports.walkInPendingReceived = _a.walkInPendingReceived, exports.walkInResolvedReceived = _a.walkInResolvedReceived;
exports.default = exports.visitorPassSlice.reducer;
