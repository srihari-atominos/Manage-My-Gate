import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import {
  dispatchNoticeCreated,
  dispatchNoticeUpdated,
  dispatchNoticeDeleted,
  dispatchNoticePinnedToggled,
  dispatchNoticeExpired,
  dispatchNoticeAcknowledgementReminder,
} from './noticeBoard.socket.js';
import logger from '../../utils/logger.utils.js';
import OrgMembership from '../orgMembership/orgMembership.model.js';
import notificationService from '../notification/notification.service.js';

import outboxService from '../outbox/outbox.service.js';

// Core native event emitter for the notice board feature domain
export const noticeEvents = new EventEmitter();

// Helper function to reliably enqueue governance notice outbox events
const enqueueNoticeOutbox = async (eventType, notice, extraPayload = {}) => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) return;
  try {
    await outboxService.enqueueEvent({
      aggregateType: 'NOTICE',
      aggregateId: notice._id || notice.id,
      eventType,
      payload: {
        noticeId: notice._id || notice.id,
        orgId: notice.orgId,
        title: notice.title,
        description: notice.description,
        isCritical: notice.isCritical,
        targetAudience: notice.targetAudience,
        createdBy: notice.createdBy,
        scheduleDate: notice.scheduleDate,
        expiryDate: notice.expiryDate,
        ...extraPayload,
      },
    });
  } catch (err) {
    logger.error(`[Notice Events] Failed to enqueue outbox event ${eventType}: ${err.message}`);
  }
};

// Hook events to Socket dispatcher and asynchronous outbox pipeline
noticeEvents.on('NOTICE_CREATED', (notice) => {
  logger.info(`Notice event bus triggered: NOTICE_CREATED for notice: ${notice._id}`);
  dispatchNoticeCreated(notice);
  if (notice.status === 'Published') {
    enqueueNoticeOutbox('NOTICE_PUBLISHED', notice);
  }
});

noticeEvents.on('NOTICE_PUBLISHED', (notice) => {
  logger.info(`Notice event bus triggered: NOTICE_PUBLISHED for notice: ${notice._id}`);
  dispatchNoticeUpdated(notice);
  enqueueNoticeOutbox('NOTICE_PUBLISHED', notice);
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

noticeEvents.on('NOTICE_EXPIRED', (notice) => {
  logger.info(`Notice event bus triggered: NOTICE_EXPIRED for notice: ${notice._id}`);
  dispatchNoticeExpired(notice);
});

noticeEvents.on('NOTICE_ACKNOWLEDGEMENT_REMINDER', (payload) => {
  logger.info(`Notice event bus triggered: NOTICE_ACKNOWLEDGEMENT_REMINDER for notice: ${payload.noticeId}`);
  dispatchNoticeAcknowledgementReminder(payload);
  enqueueNoticeOutbox('NOTICE_ACKNOWLEDGEMENT_REMINDER', payload.notice || { _id: payload.noticeId, orgId: payload.orgId }, {
    deadline: payload.deadline,
    isPastDeadline: payload.isPastDeadline,
  });
});

export default noticeEvents;
