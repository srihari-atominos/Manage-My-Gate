import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/store/authSlice';
import visitorPassReducer from '../features/visitor/store/visitorPassSlice';
import noticeBoardReducer from '../features/noticeBoard/store/noticeBoardSlice';
import complaintReducer from '../features/complaints/store/complaintSlice';
import billingReducer from '../features/billing/store/billingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    visitorPass: visitorPassReducer,
    noticeBoard: noticeBoardReducer,
    complaints: complaintReducer,
    billing: billingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
