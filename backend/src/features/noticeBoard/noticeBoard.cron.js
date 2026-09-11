import cron from 'node-cron';
import noticeBoardService from './noticeBoard.service.js';
import logger from '../../utils/logger.utils.js';

class NoticeBoardCron {
  init() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.runNow();
      } catch (err) {
        logger.error('[NoticeBoard Cron] Scheduled tick failed:', err);
      }
    });
    logger.info('[NoticeBoard Cron] Initialized background schedule (every 5 mins).');
  }

  async runNow(now = new Date()) {
    try {
      // 1. Process scheduled notices
      const scheduledResult = await noticeBoardService.processScheduledNotices(now);
      if (scheduledResult.processedCount > 0) {
        logger.info(`[NoticeBoard Cron] Published ${scheduledResult.processedCount} scheduled notices.`);
      }

      // 2. Process expired notices
      const expiredResult = await noticeBoardService.processExpiredNotices(now);
      if (expiredResult.expiredCount > 0) {
        logger.info(`[NoticeBoard Cron] Expired ${expiredResult.expiredCount} past-due notices.`);
      }

      // 3. Process acknowledgement deadline alerts
      const ackResult = await noticeBoardService.processAcknowledgementDeadlines(now);
      if (ackResult.remindedCount > 0) {
        logger.info(`[NoticeBoard Cron] Sent reminders for ${ackResult.remindedCount} critical notices.`);
      }

      return {
        scheduled: scheduledResult,
        expired: expiredResult,
        acknowledgements: ackResult
      };
    } catch (error) {
      logger.error('[NoticeBoard Cron] Error during notice lifecycle automation run:', error);
      throw error;
    }
  }
}

export default new NoticeBoardCron();
