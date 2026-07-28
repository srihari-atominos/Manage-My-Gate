import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class PlatformQuoteEvents extends EventEmitter {}

const platformQuoteEvents = new PlatformQuoteEvents();

platformQuoteEvents.on('quote.created', (quote) => {
  logger.info(`[PlatformQuote Event] quote.created - Quote: ${quote._id} Number: ${quote.quoteNumber} Status: ${quote.status}`);
});

platformQuoteEvents.on('platform_quote_approved', (quote) => {
  logger.info(`[PlatformQuote Event] quote_approved - Quote: ${quote._id} (${quote.quoteNumber}) Approved by: ${quote.approvalDetails?.approvedBy}`);
});

platformQuoteEvents.on('platform_quote_rejected', (quote) => {
  logger.info(`[PlatformQuote Event] quote_rejected - Quote: ${quote._id} (${quote.quoteNumber}) Reason: ${quote.approvalDetails?.rejectionReason}`);
});

platformQuoteEvents.on('platform_quote_status_updated', ({ quote, previousStatus, newStatus }) => {
  logger.info(`[PlatformQuote Event] status_updated - Quote: ${quote._id} (${quote.quoteNumber}) ${previousStatus} -> ${newStatus}`);
});

platformQuoteEvents.on('platform_quote_deleted', (quote) => {
  logger.info(`[PlatformQuote Event] quote_deleted - Quote: ${quote._id} Number: ${quote.quoteNumber}`);
});

export default platformQuoteEvents;
