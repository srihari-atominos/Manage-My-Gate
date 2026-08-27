import { configureStore } from '@reduxjs/toolkit';
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
import walletReducer from '../features/amenities/store/walletSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import notificationReducer from '../features/notification/store/notificationSlice';
import roleBuilderReducer from '../features/roleBuilder/store/roleSlice';
import userManagementReducer from '../features/userManagement/store/userSlice';
import integrationHubReducer from '../features/integrationHub/store/integrationHubSlice';
import communityPulseReducer from '../features/communityPulse/store/communityPulseSlice';

export const store = configureStore({
  reducer: {
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
    wallet: walletReducer,
    dashboard: dashboardReducer,
    notification: notificationReducer,
    roleBuilder: roleBuilderReducer,
    userManagement: userManagementReducer,
    integrationHub: integrationHubReducer,
    communityPulse: communityPulseReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
