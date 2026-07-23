import { EventEmitter } from 'events';
import {
  dispatchNoticeCreated,
  dispatchNoticeUpdated,
  dispatchNoticeDeleted,
  dispatchNoticePinnedToggled,
} from './noticeBoard.socket.js';
import logger from '../../utils/logger.utils.js';
import User from '../user/user.model.js';
import notificationService from '../notification/notification.service.js';

// Core native event emitter for the notice board feature domain
export const noticeEvents = new EventEmitter();

// Helper function to notify all active users
const notifyUsers = async (notice) => {
  if (notice.status !== 'Published') return;
  try {
    const activeUsers = await User.find({ status: 'Active', organization: notice.orgId });
    logger.info(`Found ${activeUsers.length} active users in organization ${notice.orgId} to notify about notice ${notice._id}`);
    
    let successCount = 0;
    for (const user of activeUsers) {
      try {
        await notificationService.createNotification({
          recipientId: user._id,
          title: 'New Notice Published',
          body: notice.title,
          actionUrl: '/notices/board',
          type: 'INFO',
          senderId: notice.createdBy
        });
        successCount++;
      } catch (err) {
        logger.error(`Failed to create notification for user ${user._id}:`, err.message);
      }
    }
    logger.info(`Successfully created ${successCount} notifications for notice ${notice._id}`);
  } catch (error) {
    logger.error('Failed to execute notifyUsers for published notice:', error);
  }
};

// Hook events to Socket dispatcher
noticeEvents.on('NOTICE_CREATED', (notice) => {
  logger.info(`Notice event bus triggered: NOTICE_CREATED for notice: ${notice._id}`);
  dispatchNoticeCreated(notice);
  notifyUsers(notice);
});

noticeEvents.on('NOTICE_PUBLISHED', (notice) => {
  logger.info(`Notice event bus triggered: NOTICE_PUBLISHED for notice: ${notice._id}`);
  dispatchNoticeUpdated(notice);
  notifyUsers(notice);
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
