import { EventEmitter } from 'events';

/**
 * Event emitter for organization lifecycle and status events,
 * allowing decoupled event-driven logging and notification triggers.
 */
export const orgEventEmitter = new EventEmitter();
export default orgEventEmitter;
