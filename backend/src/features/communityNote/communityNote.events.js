import { EventEmitter } from 'events';

class CommunityNoteEvents extends EventEmitter {}

export const communityNoteEvents = new CommunityNoteEvents();
export default communityNoteEvents;
