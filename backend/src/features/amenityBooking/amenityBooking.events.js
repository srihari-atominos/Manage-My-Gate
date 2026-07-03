import EventEmitter from 'events';

class AmenityBookingEvents extends EventEmitter {}

export const amenityBookingEventEmitter = new AmenityBookingEvents();

// Define Event Names
export const AMENITY_BOOKING_CREATED = 'AMENITY_BOOKING_CREATED';
export const AMENITY_BOOKING_REVIEWED = 'AMENITY_BOOKING_REVIEWED';
export const AMENITY_BOOKING_CANCELLED = 'AMENITY_BOOKING_CANCELLED';
export const AMENITY_BOOKING_CHECKED_IN = 'AMENITY_BOOKING_CHECKED_IN';
export const AMENITY_BOOKING_COMPLETED = 'AMENITY_BOOKING_COMPLETED';
