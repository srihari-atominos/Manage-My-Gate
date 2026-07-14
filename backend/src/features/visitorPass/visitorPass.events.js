import { EventEmitter } from 'events';

class VisitorPassEvents extends EventEmitter {}

const visitorPassEvents = new VisitorPassEvents();

export default visitorPassEvents;
