import { EventEmitter } from 'events';

class TechnicianEvents extends EventEmitter {}

const technicianEvents = new TechnicianEvents();

export default technicianEvents;
