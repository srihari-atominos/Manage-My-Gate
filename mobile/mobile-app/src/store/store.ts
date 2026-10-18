import { configureStore, combineReducers, type AnyAction, type Middleware } from '@reduxjs/toolkit';
import authReducer from '../features/auth/store/authSlice';
import visitorPassReducer from '../features/visitor/store/visitorPassSlice';
import noticeBoardReducer from '../features/noticeBoard/store/noticeBoardSlice';
import pollReducer from '../features/poll/store/pollSlice';
import complaintReducer from '../features/complaints/store/complaintSlice';
import billingReducer from '../features/billing/store/billingSlice';
import villaReducer from '../features/villa/store/villaSlice';
import amenityReducer from '../features/amenities/store/amenitySlice';
import securityLogReducer from '../features/amenities/store/securityLogSlice';
import amenityBookingReducer from '../features/amenities/store/amenityBookingSlice';
import amenitySettingsReducer from '../features/amenities/store/amenitySettingsSlice';
import walletReducer from '../features/wallet/store/walletSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import notificationReducer from '../features/notification/store/notificationSlice';
import roleBuilderReducer from '../features/roleBuilder/store/roleSlice';
import userManagementReducer from '../features/userManagement/store/userSlice';
import integrationHubReducer from '../features/integrationHub/store/integrationHubSlice';
import workspaceReducer from '../features/workspace/store/workspaceSlice';
import communityPulseReducer from '../features/communityPulse/store/communityPulseSlice';
import directoryReducer from '../features/directory/store/directorySlice';
import communityNoteReducer from '../features/directory/store/communityNoteSlice';
import directoryMessagingReducer from '../features/directory/store/directoryMessagingSlice';
import communityEngagementReducer from '../features/communityEngagement/store/communityEngagementSlice';
import issueReportReducer from '../features/issueReport/store/issueReportSlice';

import { injectStore, cancelInFlightRequests } from '../services/apiClient';
import { isConnectivityErrorMessage } from '../services/networkStatus';

import visitorReducer from '../modules/visitor-management/visitorSlice';
import staffReducer from '../features/staff/store/staffSlice';
import automationReducer from '../modules/automation-engine/automationSlice';

/**
 * A lost connection is already communicated by NetworkRecoveryProvider. Redux features used to
 * copy the same message into local error fields, causing every list/form to render its own red
 * alert. Strip only recognised connectivity messages before reducers see rejected actions; real
 * validation, permission and server business errors remain unchanged.
 */
const suppressInlineConnectivityErrors: Middleware = () => (next) => (action) => {
  const rejectedAction = action as any;
  if (typeof rejectedAction?.type !== 'string' || !rejectedAction.type.endsWith('/rejected')) {
    return next(action);
  }

  const message = rejectedAction.payload ?? rejectedAction.error?.message;
  if (!isConnectivityErrorMessage(message)) return next(action);

  return next({
    ...rejectedAction,
    payload: null,
    error: { ...rejectedAction.error, message: '' },
  });
};

const appReducer = combineReducers({
  auth: authReducer,
  visitorPass: visitorPassReducer,
  noticeBoard: noticeBoardReducer,
  poll: pollReducer,
  complaints: complaintReducer,
  billing: billingReducer,
  villa: villaReducer,
  amenities: amenityReducer,
  securityLogs: securityLogReducer,
  amenityBookings: amenityBookingReducer,
  amenitySettings: amenitySettingsReducer,
  wallet: walletReducer,
  dashboard: dashboardReducer,
  notification: notificationReducer,
  roleBuilder: roleBuilderReducer,
  userManagement: userManagementReducer,
  integrationHub: integrationHubReducer,
  workspace: workspaceReducer,
  communityPulse: communityPulseReducer,
  directory: directoryReducer,
  communityNote: communityNoteReducer,
  directoryMessaging: directoryMessagingReducer,
  communityEngagement: communityEngagementReducer,
  issueReport: issueReportReducer,
  visitor: visitorReducer,
  staff: staffReducer,
  automation: automationReducer,
});

export const rootReducer = (state: any, action: AnyAction) => {
  // Reset all feature slices on logout or workspace/tenant switch to prevent cross-tenant data leakage
  if (
    action.type === 'auth/logout' ||
    action.type === 'auth/performLogout/fulfilled' ||
    action.type === 'auth/switchWorkspaceContext/fulfilled' ||
    action.type === 'auth/switchWorkspaceContext/pending' ||
    action.type === 'auth/setActiveCommunityOrg' ||
    action.type === 'workspace/setActiveWorkspace' ||
    action.type === 'workspace/clearWorkspace'
  ) {
    cancelInFlightRequests(`State reset triggered by ${action.type}`);
    if (
      action.type === 'auth/switchWorkspaceContext/fulfilled' ||
      action.type === 'auth/switchWorkspaceContext/pending' ||
      action.type === 'auth/setActiveCommunityOrg' ||
      action.type === 'workspace/setActiveWorkspace'
    ) {
      // Preserve auth session identity while purging all tenant-scoped feature data
      state = {
        auth: state?.auth,
      };
    } else {
      // Complete logout or teardown: purge all state
      state = undefined;
    }
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(suppressInlineConnectivityErrors),
});

injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
