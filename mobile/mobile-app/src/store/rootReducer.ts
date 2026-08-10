import { combineReducers } from '@reduxjs/toolkit';
import visitorReducer from '../modules/visitor-management/visitorSlice';
import staffReducer from '../modules/staff-operations/staffSlice';
import automationReducer from '../modules/automation-engine/automationSlice';

export const rootReducer = combineReducers({
  visitor: visitorReducer,
  staff: staffReducer,
  automation: automationReducer,
  // add other reducers here as needed
});

export type RootState = ReturnType<typeof rootReducer>;
