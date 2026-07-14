import { EventEmitter } from 'events';
import {
  dispatchNoticeCreated,
  dispatchNoticeUpdated,
  dispatchNoticeDeleted,
  dispatchNoticePinnedToggled,
} from './noticeBoard.socket.js';
import logger from '../../utils/logger.utils.js';

// Core native event emitter for the notice board feature domain
export const noticeEvents = new EventEmitter();

// Hook events to Socket dispatcher
noticeEvents.on('NOTICE_CREATED', (notice) => {
  logger.info(`Notice event bus triggered: NOTICE_CREATED for notice: ${notice._id}`);
  dispatchNoticeCreated(notice);
});

noticeEvents.on('NOTICE_UPDATED', (notice) => {
  logger.info(`Notice event bus triggered: NOTICE_UPDATED for notice: ${notice._id}`);
  dispatchNoticeUpdated(notice);
});

noticeEvents.on('NOTICE_DELETED', ({ id, orgId, userId }) => {
  logger.info(`Notice event bus triggered: NOTICE_DELETED for notice: ${id}`);
  dispatchNoticeDeleted(id, orgId, userId);
});

noticeEvents.on('NOTICE_PINNED_TOGGLED', (notice) => {
  logger.info(`Notice event bus triggered: NOTICE_PINNED_TOGGLED for notice: ${notice._id}`);
  dispatchNoticePinnedToggled(notice);
});

export default noticeEvents;
