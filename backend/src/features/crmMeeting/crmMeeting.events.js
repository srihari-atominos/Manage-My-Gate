import { EventEmitter } from 'events';
import logger from '../../utils/logger.utils.js';

class CrmMeetingEvents extends EventEmitter {}

const crmMeetingEvents = new CrmMeetingEvents();

crmMeetingEvents.on('meeting_scheduled', (meeting) => {
  logger.info(`[CRM Meeting Event] Meeting scheduled: "${meeting.title}" on ${meeting.scheduledAt} (_id: ${meeting._id}, Link: ${meeting.googleMeetLink})`);
});

crmMeetingEvents.on('meeting_updated', (meeting) => {
  logger.info(`[CRM Meeting Event] Meeting updated: "${meeting.title}" (_id: ${meeting._id}, Status: ${meeting.status})`);
});

crmMeetingEvents.on('meeting_cancelled', (meeting) => {
  logger.info(`[CRM Meeting Event] Meeting cancelled: "${meeting.title}" (_id: ${meeting._id})`);
});

export default crmMeetingEvents;
