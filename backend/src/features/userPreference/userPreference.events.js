import { EventEmitter } from 'events';

class UserPreferenceEventEmitter extends EventEmitter {}

export const userPreferenceEvents = new UserPreferenceEventEmitter();
export const USER_PREFERENCE_UPDATED = 'userPreference.updated';

export default userPreferenceEvents;
