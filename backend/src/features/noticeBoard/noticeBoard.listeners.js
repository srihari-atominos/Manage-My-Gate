import './noticeBoard.events.js';
import './noticeBoard.audit.js';
import noticeBoardCron from './noticeBoard.cron.js';
import logger from '../../utils/logger.utils.js';

try {
  logger.info('[NoticeBoard] Event listeners and background handlers registered.');
} catch (error) {
  logger.error('[NoticeBoard] Failed to register event listeners:', error);
}

export { noticeBoardCron };
