import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class CrmTaskEvents extends EventEmitter {}

const crmTaskEvents = new CrmTaskEvents();

crmTaskEvents.on('taskCreated', (task) => {
  logger.info(`[CRM Task Event] Task created: "${task.title}" (_id: ${task._id})`);
});

crmTaskEvents.on('taskUpdated', (task) => {
  logger.info(`[CRM Task Event] Task updated: "${task.title}" (_id: ${task._id})`);
});

crmTaskEvents.on('taskDeleted', (id) => {
  logger.info(`[CRM Task Event] Task deleted: ${id}`);
});

export default crmTaskEvents;
