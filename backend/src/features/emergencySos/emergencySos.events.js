import { EventEmitter } from 'events';
import { dispatchSosTriggered, dispatchSosStatusUpdated } from './emergencySos.socket.js';
import logger from '../../utils/logger.utils.js';

class EmergencySosEventEmitter extends EventEmitter {}

export const emergencySosEvents = new EmergencySosEventEmitter();

emergencySosEvents.on('SOS_TRIGGERED', (alert) => {
  logger.info(`[Emergency SOS Events] Handling SOS_TRIGGERED for alert: ${alert._id}`);
  dispatchSosTriggered(alert);
});

emergencySosEvents.on('SOS_STATUS_UPDATED', (alert) => {
  logger.info(`[Emergency SOS Events] Handling SOS_STATUS_UPDATED for alert: ${alert._id}`);
  dispatchSosStatusUpdated(alert);
});

export default emergencySosEvents;
