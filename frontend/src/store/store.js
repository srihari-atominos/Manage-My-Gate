import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice.js';
import sampleFeatureReducer from '../features/sampleFeature/sampleFeatureSlice.js';

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
