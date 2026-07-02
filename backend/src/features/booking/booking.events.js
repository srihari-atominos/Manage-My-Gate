import EventEmitter from 'events';

class BookingEvents extends EventEmitter {}

export const bookingEventEmitter = new BookingEvents();

// Define Event Names
export const BOOKING_CREATED = 'BOOKING_CREATED';
export const BOOKING_STATUS_UPDATED = 'BOOKING_STATUS_UPDATED';
