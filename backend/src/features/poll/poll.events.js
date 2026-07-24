import { EventEmitter } from 'events';

class PollEvents extends EventEmitter {}
const pollEvents = new PollEvents();

export default pollEvents;
