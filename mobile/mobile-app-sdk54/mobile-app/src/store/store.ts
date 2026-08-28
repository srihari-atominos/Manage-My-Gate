import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/store/authSlice';
import visitorPassReducer from '../features/visitor/store/visitorPassSlice';
import noticeBoardReducer from '../features/noticeBoard/store/noticeBoardSlice';
import pollReducer from '../features/poll/store/pollSlice';
import complaintReducer from '../features/complaints/store/complaintSlice';
import billingReducer from '../features/billing/store/billingSlice';
import billingWalletReducer from '../features/billing/store/walletSlice';
import villaReducer from '../features/villa/store/villaSlice';
import amenityReducer from '../features/amenities/store/amenitySlice';
import amenityBookingReducer from '../features/amenities/store/amenityBookingSlice';
import amenityWalletReducer from '../features/amenities/store/walletSlice';
import securityLogReducer from '../features/amenities/store/securityLogSlice';
import dashboardReducer from '../features/dashboard/dashboardSlice';
import notificationReducer from '../features/notification/store/notificationSlice';
import { injectStore } from '../services/apiClient';


export const store = configureStore({
  reducer: {
    auth: authReducer,
    visitorPass: visitorPassReducer,
    noticeBoard: noticeBoardReducer,
    poll: pollReducer,
    complaints: complaintReducer,
    billing: billingReducer,
    wallet: billingWalletReducer,
    villa: villaReducer,
    amenities: amenityReducer,
    amenityBookings: amenityBookingReducer,
    amenityWallet: amenityWalletReducer,
    securityLogs: securityLogReducer,
    dashboard: dashboardReducer,
    notification: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

