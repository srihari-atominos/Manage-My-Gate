import { EventEmitter } from 'events';

class StaffAttendanceEvents extends EventEmitter {}

const staffAttendanceEvents = new StaffAttendanceEvents();

export default staffAttendanceEvents;
