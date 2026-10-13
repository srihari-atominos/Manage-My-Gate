import EventEmitter from 'events';

class StaffUnitAssociationEvents extends EventEmitter {}

export const staffUnitAssociationEvents = new StaffUnitAssociationEvents();
export default staffUnitAssociationEvents;
