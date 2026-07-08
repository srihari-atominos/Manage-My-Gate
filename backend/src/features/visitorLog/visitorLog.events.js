import { EventEmitter } from 'events';
import { dispatchWalkInPending } from './visitorLog.socket.js';
import logger from '../../utils/logger.utils.js';

class VisitorLogEvents extends EventEmitter {}

const visitorLogEvents = new VisitorLogEvents();

// Hook event to Socket dispatcher
visitorLogEvents.on('walk_in_pending', (log) => {
  logger.info(`Visitor log event bus triggered: walk_in_pending for log ID ${log._id}`);
  dispatchWalkInPending(log);
});

export default visitorLogEvents;
