import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class CrmInquiryEvents extends EventEmitter {}

const crmInquiryEvents = new CrmInquiryEvents();

crmInquiryEvents.on('inquiryCreated', (inquiry) => {
  logger.info(`[CRM Inquiry Event] Inquiry created: ${inquiry.inquiryId} (_id: ${inquiry._id})`);
});

crmInquiryEvents.on('inquiryUpdated', (inquiry) => {
  logger.info(`[CRM Inquiry Event] Inquiry updated: ${inquiry.inquiryId} (_id: ${inquiry._id})`);
});

crmInquiryEvents.on('inquiryDeleted', (id) => {
  logger.info(`[CRM Inquiry Event] Inquiry deleted: ${id}`);
});

export default crmInquiryEvents;
