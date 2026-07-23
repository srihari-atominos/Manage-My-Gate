import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice.js';
import sampleFeatureReducer from '../features/sampleFeature/store/sampleFeatureSlice.js';
import authReducer from '../features/auth/store/authSlice.js';
import userReducer from '../features/userManagement/store/userSlice.js';
import roleReducer from '../features/roleBuilder/store/roleSlice.js';
import notificationsReducer from '../features/notification/store/notificationSlice.js';
import integrationHubReducer from '../features/integrationHub/store/integrationHubSlice.js';
import workspaceReducer from '../features/workspace/store/workspaceSlice.js';
import workspaceModulesReducer from '../features/workspace/store/workspaceModulesSlice.js';
import adminWorkspaceReducer from '../features/adminWorkspace/store/adminWorkspaceSlice.js';
import organizationReducer from '../features/organization/store/organizationSlice.js';
import auditLogReducer from '../features/auditLog/store/auditLogSlice.js';

import messageTemplateReducer from '../features/messageTemplate/store/messageTemplateSlice.js';
import villaReducer from '../features/villa/store/villaSlice.js';
import amenityReducer from '../features/amenities/store/amenitySlice.js';
import dashboardReducer from '../features/amenities/store/dashboardSlice.js';
import securityLogReducer from '../features/amenities/store/securityLogSlice.js';
import visitorPassReducer from '../features/visitorManagement/store/visitorPassSlice.js';
import visitorLogReducer from '../features/visitorManagement/store/visitorLogSlice.js';
import blacklistReducer from '../features/visitorManagement/store/blacklistSlice.js';
import noticeBoardReducer from '../features/noticeBoard/store/noticeBoardSlice.js';
import complaintReducer from '../features/complaints/store/complaintSlice.js';
import complaintSettingsReducer from '../features/complaints/store/complaintSettingsSlice.js';

// Custom lightweight state logger middleware for development mode
const stateLoggerMiddleware = (store) => (next) => (action) => {
  console.group(`Action: ${action.type}`);
  console.log('%cPrev State:', 'color: #9E9E9E; font-weight: bold;', store.getState());
  console.log('%cAction:', 'color: #03A9F4; font-weight: bold;', action);
  const result = next(action);
  console.log('%cNext State:', 'color: #4CAF50; font-weight: bold;', store.getState());
  console.groupEnd();
  return result;
};

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    sampleFeature: sampleFeatureReducer,
    auth: authReducer,
    userManagement: userReducer,
    roleBuilder: roleReducer,
    notifications: notificationsReducer,
    integrationHub: integrationHubReducer,
    workspace: workspaceReducer,
    workspaceModules: workspaceModulesReducer,
    adminWorkspace: adminWorkspaceReducer,
    organization: organizationReducer,
    auditLog: auditLogReducer,

    messageTemplate: messageTemplateReducer,
    villa: villaReducer,
    amenities: amenityReducer,
    amenitiesDashboard: dashboardReducer,
    securityLogs: securityLogReducer,
    visitorPass: visitorPassReducer,
    visitorLog: visitorLogReducer,
    blacklist: blacklistReducer,
    noticeBoard: noticeBoardReducer,
    complaints: complaintReducer,
    complaintSettings: complaintSettingsReducer,
  },
  middleware: (getDefaultMiddleware) => {
    const middlewares = getDefaultMiddleware();
    if (isDev) {
      middlewares.push(stateLoggerMiddleware);
    }
    return middlewares;
  },
  devTools: isDev,
});

export default store;
