import { EventEmitter } from 'events';

class AuthEventEmitter extends EventEmitter {}
const authEvents = new AuthEventEmitter();

export default authEvents;
