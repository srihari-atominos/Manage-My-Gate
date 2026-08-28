import { EventEmitter } from 'events';

class DirectoryMessageEvents extends EventEmitter {}

export const directoryMessageEvents = new DirectoryMessageEvents();
export default directoryMessageEvents;
