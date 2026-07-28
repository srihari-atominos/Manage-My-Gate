import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class CrmThreadEvents extends EventEmitter {}

const crmThreadEvents = new CrmThreadEvents();

crmThreadEvents.on('threadCreated', (thread) => {
  logger.info(`[CRM Thread Event] Thread created for inquiryId: ${thread.inquiryId} (_id: ${thread._id})`);
});

crmThreadEvents.on('messageAdded', ({ threadId, inquiryId, message }) => {
  logger.info(`[CRM Thread Event] Message added to thread ${threadId} (Inquiry: ${inquiryId}, Sender: ${message.senderType})`);
});

crmThreadEvents.on('threadDeleted', (id) => {
  logger.info(`[CRM Thread Event] Thread deleted: ${id}`);
});

export default crmThreadEvents;
