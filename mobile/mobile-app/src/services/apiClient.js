"use strict";
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
exports.injectStore = void 0;
var axios_1 = require("axios");
var storage_1 = require("../utils/storage");
// A pure JavaScript UUID v4 generator to prevent Expo native crypto errors
var generateUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
var react_native_1 = require("react-native");
var getDefaultBaseUrl = function () {
    if (react_native_1.Platform.OS === 'android') {
        return 'http://10.0.2.2:5002/api';
    }
    return 'http://localhost:5002/api';
};
var apiClient = axios_1.default.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL || getDefaultBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
    withCredentials: true,
});
var isRefreshing = false;
var failedQueue = [];
var store;
var injectStore = function (_store) {
    store = _store;
};
exports.injectStore = injectStore;
var processQueue = function (error, token) {
    if (token === void 0) { token = null; }
    failedQueue.forEach(function (prom) {
        if (error) {
            prom.reject(error);
        }
        else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};
// Helper to safely extract payload claims from JWT token
var decodeJwtPayload = function (token) {
    try {
        var parts = token.split('.');
        if (parts.length < 2)
            return null;
        var base64Url = parts[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        if (typeof atob === 'function') {
            var jsonPayload = decodeURIComponent(atob(base64)
                .split('')
                .map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); })
                .join(''));
            return JSON.parse(jsonPayload);
        }
        return null;
    }
    catch (e) {
        try {
            var parts = token.split('.');
            if (parts.length >= 2 && typeof atob === 'function') {
                return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            }
        }
        catch (e2) { }
        return null;
    }
};
// Request Interceptor: Attach headers and correlation ID
apiClient.interceptors.request.use(function (config) { return __awaiter(void 0, void 0, void 0, function () {
    var state, token, rawOrgId, userStr, user, jwtData, activeOrgId, err_1;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    return __generator(this, function (_4) {
        switch (_4.label) {
            case 0:
                // Generate and inject a unique Request Correlation ID
                config.headers['X-Request-ID'] = generateUUID();
                _4.label = 1;
            case 1:
                _4.trys.push([1, 6, , 7]);
                state = store ? store.getState() : null;
                token = (_a = state === null || state === void 0 ? void 0 : state.auth) === null || _a === void 0 ? void 0 : _a.token;
                if (!!token) return [3 /*break*/, 3];
                return [4 /*yield*/, storage_1.default.getItem('token')];
            case 2:
                token = _4.sent();
                _4.label = 3;
            case 3:
                if (token) {
                    config.headers.Authorization = "Bearer ".concat(token);
                }
                rawOrgId = ((_b = state === null || state === void 0 ? void 0 : state.workspace) === null || _b === void 0 ? void 0 : _b.activeOrganizationId) ||
                    ((_d = (_c = state === null || state === void 0 ? void 0 : state.auth) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.orgId) ||
                    ((_f = (_e = state === null || state === void 0 ? void 0 : state.auth) === null || _e === void 0 ? void 0 : _e.user) === null || _f === void 0 ? void 0 : _f.organizationId) ||
                    ((_j = (_h = (_g = state === null || state === void 0 ? void 0 : state.auth) === null || _g === void 0 ? void 0 : _g.user) === null || _h === void 0 ? void 0 : _h.org) === null || _j === void 0 ? void 0 : _j._id) ||
                    ((_l = (_k = state === null || state === void 0 ? void 0 : state.auth) === null || _k === void 0 ? void 0 : _k.user) === null || _l === void 0 ? void 0 : _l.org) ||
                    ((_o = (_m = state === null || state === void 0 ? void 0 : state.auth) === null || _m === void 0 ? void 0 : _m.user) === null || _o === void 0 ? void 0 : _o.activeOrgId) ||
                    ((_q = (_p = state === null || state === void 0 ? void 0 : state.auth) === null || _p === void 0 ? void 0 : _p.user) === null || _q === void 0 ? void 0 : _q.activeOrganizationId) ||
                    (Array.isArray((_s = (_r = state === null || state === void 0 ? void 0 : state.auth) === null || _r === void 0 ? void 0 : _r.user) === null || _s === void 0 ? void 0 : _s.availableWorkspaces) && ((_v = (_u = (_t = state === null || state === void 0 ? void 0 : state.auth) === null || _t === void 0 ? void 0 : _t.user) === null || _u === void 0 ? void 0 : _u.availableWorkspaces[0]) === null || _v === void 0 ? void 0 : _v.orgId)) ||
                    (Array.isArray((_x = (_w = state === null || state === void 0 ? void 0 : state.auth) === null || _w === void 0 ? void 0 : _w.user) === null || _x === void 0 ? void 0 : _x.availableWorkspaces) && ((_0 = (_z = (_y = state === null || state === void 0 ? void 0 : state.auth) === null || _y === void 0 ? void 0 : _y.user) === null || _z === void 0 ? void 0 : _z.availableWorkspaces[0]) === null || _0 === void 0 ? void 0 : _0._id));
                if (!!rawOrgId) return [3 /*break*/, 5];
                return [4 /*yield*/, storage_1.default.getItem('user')];
            case 4:
                userStr = _4.sent();
                if (userStr) {
                    try {
                        user = JSON.parse(userStr);
                        rawOrgId =
                            (user === null || user === void 0 ? void 0 : user.orgId) ||
                                (user === null || user === void 0 ? void 0 : user.organizationId) ||
                                ((_1 = user === null || user === void 0 ? void 0 : user.org) === null || _1 === void 0 ? void 0 : _1._id) ||
                                (user === null || user === void 0 ? void 0 : user.org) ||
                                (user === null || user === void 0 ? void 0 : user.activeOrgId) ||
                                (user === null || user === void 0 ? void 0 : user.activeOrganizationId) ||
                                (Array.isArray(user === null || user === void 0 ? void 0 : user.availableWorkspaces) && ((_2 = user === null || user === void 0 ? void 0 : user.availableWorkspaces[0]) === null || _2 === void 0 ? void 0 : _2.orgId)) ||
                                (Array.isArray(user === null || user === void 0 ? void 0 : user.availableWorkspaces) && ((_3 = user === null || user === void 0 ? void 0 : user.availableWorkspaces[0]) === null || _3 === void 0 ? void 0 : _3._id));
                    }
                    catch (e) { }
                }
                _4.label = 5;
            case 5:
                // If orgId is still missing, extract it directly from the JWT token payload claims
                if (!rawOrgId && token) {
                    jwtData = decodeJwtPayload(token);
                    rawOrgId =
                        (jwtData === null || jwtData === void 0 ? void 0 : jwtData.orgId) ||
                            (jwtData === null || jwtData === void 0 ? void 0 : jwtData.organizationId) ||
                            (jwtData === null || jwtData === void 0 ? void 0 : jwtData.org) ||
                            (jwtData === null || jwtData === void 0 ? void 0 : jwtData.activeOrgId);
                }
                activeOrgId = typeof rawOrgId === 'object' && rawOrgId !== null
                    ? rawOrgId._id || rawOrgId.id || String(rawOrgId)
                    : rawOrgId;
                if (activeOrgId && activeOrgId !== '[object Object]') {
                    config.headers['x-organization-id'] = activeOrgId;
                }
                return [3 /*break*/, 7];
            case 6:
                err_1 = _4.sent();
                console.error('Failed to inject headers in mobile request interceptor:', err_1);
                return [3 /*break*/, 7];
            case 7:
                // Handle multipart form data Content-Type override for FormData payloads
                if (config.data && config.data instanceof FormData) {
                    if (react_native_1.Platform.OS === 'web') {
                        // Let browser set the header with boundary
                        delete config.headers['Content-Type'];
                    }
                    else {
                        config.headers['Content-Type'] = 'multipart/form-data';
                    }
                }
                return [2 /*return*/, config];
        }
    });
}); }, function (error) { return Promise.reject(error); });
// Response Interceptor: Extract envelope data and handle JWT refresh
apiClient.interceptors.response.use(function (response) {
    // Return the backend's standard { success, message, data } envelope
    return response.data;
}, function (error) { return __awaiter(void 0, void 0, void 0, function () {
    var originalRequest, isAuthEndpoint, res, newToken, refreshError_1;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                originalRequest = error.config;
                if (error.message === 'Network Error') {
                    console.warn('Network Error - check backend server connectivity');
                }
                isAuthEndpoint = (originalRequest === null || originalRequest === void 0 ? void 0 : originalRequest.url) && (originalRequest.url.includes('/auth/login') ||
                    originalRequest.url.includes('/auth/refresh-token') ||
                    originalRequest.url.includes('/auth/register') ||
                    originalRequest.url.includes('/auth/forgot-password') ||
                    originalRequest.url.includes('/auth/reset-password'));
                if (!(((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401 && !originalRequest._retry && !isAuthEndpoint)) return [3 /*break*/, 5];
                if (isRefreshing) {
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            failedQueue.push({ resolve: resolve, reject: reject });
                        })
                            .then(function (token) {
                            originalRequest.headers['Authorization'] = 'Bearer ' + token;
                            return apiClient(originalRequest);
                        })
                            .catch(function (err) { return Promise.reject(err); })];
                }
                originalRequest._retry = true;
                isRefreshing = true;
                _g.label = 1;
            case 1:
                _g.trys.push([1, 3, 4, 5]);
                return [4 /*yield*/, axios_1.default.post("".concat(apiClient.defaults.baseURL, "/auth/refresh-token"), {}, { headers: { 'Content-Type': 'application/json' }, withCredentials: true })];
            case 2:
                res = _g.sent();
                if (res.status === 200 || res.status === 201) {
                    newToken = res.data.token;
                    if (store) {
                        try {
                            // Dispatch plain action object to avoid dynamic import of authSlice
                            store.dispatch({ type: 'auth/updateTokenAndUser', payload: { token: newToken } });
                        }
                        catch (dispatchErr) {
                            console.error('Failed to update refreshed token in store:', dispatchErr);
                        }
                    }
                    apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
                    originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
                    processQueue(null, newToken);
                    return [2 /*return*/, apiClient(originalRequest)];
                }
                return [3 /*break*/, 5];
            case 3:
                refreshError_1 = _g.sent();
                processQueue(refreshError_1, null);
                if (store) {
                    try {
                        store.dispatch({ type: 'auth/logout' });
                    }
                    catch (dispatchErr) {
                        console.error('Failed to trigger mobile auto-logout on refresh failure', dispatchErr);
                    }
                }
                return [2 /*return*/, Promise.reject(refreshError_1)];
            case 4:
                isRefreshing = false;
                return [7 /*endfinally*/];
            case 5:
                if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 400 && ((_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) === 'Workspace context is required.') {
                    console.warn('Workspace context lost. Forcing auto-logout to recover corrupted local state.');
                    if (store) {
                        try {
                            store.dispatch({ type: 'auth/logout' });
                        }
                        catch (dispatchErr) {
                            console.error('Failed to trigger mobile auto-logout on 400 Bad Request', dispatchErr);
                        }
                    }
                }
                if ((_f = (_e = error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) {
                    error.message = error.response.data.message;
                }
                return [2 /*return*/, Promise.reject(error)];
        }
    });
}); });
exports.default = apiClient;
