import EventEmitter from 'events';

class BlacklistEvents extends EventEmitter {}

const blacklistEvents = new BlacklistEvents();

export default blacklistEvents;
