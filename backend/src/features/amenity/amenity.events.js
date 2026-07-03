import EventEmitter from 'events';

class AmenityEvents extends EventEmitter {}

export const amenityEventEmitter = new AmenityEvents();

// Define Event Names
export const AMENITY_CREATED = 'AMENITY_CREATED';
export const AMENITY_UPDATED = 'AMENITY_UPDATED';
export const AMENITY_DELETED = 'AMENITY_DELETED';
