import { EventEmitter } from 'events';

/**
 * Native Node.js EventEmitter for the Auth feature domain.
 * Disseminates internal domain events (e.g. login, creation, password resets)
 * to decouple transport-specific logic (like WebSocket notifications or audit logs)
 * from the core service layer.
 */
class AuthEventEmitter extends EventEmitter {}

const authEvents = new AuthEventEmitter();

export default authEvents;
