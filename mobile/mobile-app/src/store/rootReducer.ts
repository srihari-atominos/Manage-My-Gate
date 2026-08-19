import { combineReducers } from '@reduxjs/toolkit';
import visitorReducer from '../modules/visitor-management/visitorSlice';
import staffReducer from '../modules/staff-operations/staffSlice';
import automationReducer from '../modules/automation-engine/automationSlice';
import noticeBoardReducer from '../features/noticeBoard/store/noticeBoardSlice';
import pollReducer from '../features/poll/store/pollSlice';

export const rootReducer = combineReducers({
  visitor: visitorReducer,
  staff: staffReducer,
  automation: automationReducer,
  noticeBoard: noticeBoardReducer,
  poll: pollReducer,
  // add other reducers here as needed
});

export type RootState = ReturnType<typeof rootReducer>;
