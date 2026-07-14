import { EventEmitter } from 'events';

// Core native event emitter for the villa feature domain
export const villaEvents = new EventEmitter();

// Load socket listeners asynchronously
import { setupVillaSocketListeners } from './villa.socket.js';
setupVillaSocketListeners().catch((err) => {
  console.error('Failed to initialize villa socket listeners:', err);
});

export default villaEvents;
