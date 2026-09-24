import noticeEvents from './noticeBoard.events.js';
import auditLogService from '../auditLog/auditLog.services.js';
import logger from '../../utils/logger.utils.js';

const logNoticeEvent = async (action, notice, actorId = null, metadata = {}) => {
  try {
    await auditLogService.logEvent({
      actorId: actorId && actorId !== 'System' ? actorId : undefined,
      action,
      targetId: notice.orgId || undefined,
      metadata: {
        ...metadata,
        noticeId: notice._id || notice.id,
        noticeTitle: notice.title,
        orgId: notice.orgId,
      },
      ipAddress: 'System Event',
    });
  } catch (error) {
    logger.error(`[Notice Audit] Failed to log ${action} event:`, error);
  }
};

noticeEvents.on('NOTICE_CREATED', (notice) => logNoticeEvent('NOTICE_CREATED', notice, notice.createdBy));
noticeEvents.on('NOTICE_UPDATED', (notice) => logNoticeEvent('NOTICE_UPDATED', notice, notice.updatedBy || notice.createdBy));
noticeEvents.on('NOTICE_DELETED', ({ id, orgId, userId }) => logNoticeEvent('NOTICE_DELETED', { _id: id, orgId, title: 'Deleted Notice' }, userId));
noticeEvents.on('NOTICE_PUBLISHED', (notice) => logNoticeEvent('NOTICE_PUBLISHED', notice, notice.publishedBy || notice.createdBy));
noticeEvents.on('NOTICE_EXPIRED', (notice) => logNoticeEvent('NOTICE_EXPIRED', notice, null, { status: 'Expired' }));
noticeEvents.on('NOTICE_PINNED_TOGGLED', (notice) => logNoticeEvent('NOTICE_PINNED_TOGGLED', notice, notice.updatedBy || notice.createdBy, { isPinned: notice.isPinned }));

export default logNoticeEvent;
