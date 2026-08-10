import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/store/authSlice';
import visitorPassReducer from '../features/visitor/store/visitorPassSlice';
import noticeBoardReducer from '../features/noticeBoard/store/noticeBoardSlice';
import complaintReducer from '../features/complaints/store/complaintSlice';
import billingReducer from '../features/billing/store/billingSlice';
import villaReducer from '../features/villa/store/villaSlice';
import amenityReducer from '../features/amenities/store/amenitySlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import notificationReducer from '../features/notification/store/notificationSlice';

import visitorReducer from '../modules/visitor-management/visitorSlice';
import staffReducer from '../modules/staff-operations/staffSlice';
import automationReducer from '../modules/automation-engine/automationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    visitorPass: visitorPassReducer,
    noticeBoard: noticeBoardReducer,
    complaints: complaintReducer,
    billing: billingReducer,
    villa: villaReducer,
    amenities: amenityReducer,
    dashboard: dashboardReducer,
    notification: notificationReducer,
    visitor: visitorReducer,
    staff: staffReducer,
    automation: automationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
