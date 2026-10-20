// @ts-nocheck
export * from './pollSlice.js';
import type { Reducer, AnyAction } from '@reduxjs/toolkit';
import reducer from './pollSlice.js';

/**
 * The poll slice is plain JavaScript, so its reducer is implicitly `any`. A single `any` reducer makes
 * combineReducers infer the entire store state as `any`, which silently disables type checking for every
 * selector in the app. Typing it here keeps the rest of the store strongly typed.
 */
export interface PollState {
  [key: string]: any;
}

export default reducer as unknown as Reducer<PollState, AnyAction>;
