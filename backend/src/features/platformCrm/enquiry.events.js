import { EventEmitter } from 'events';

class EnquiryEvents extends EventEmitter {}

const enquiryEvents = new EnquiryEvents();

export default enquiryEvents;
