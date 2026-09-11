import cron from 'node-cron';
import logger from '../../utils/logger.utils.js';
import { processExpiredPolls, processClosingSoonPolls } from './poll.services.js';

class PollCron {
  init() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.runNow();
      } catch (err) {
        logger.error('[Poll Cron] Scheduled tick failed:', err);
      }
    });
    logger.info('[Poll Cron] Initialized background schedule (every 5 mins).');
  }

  async runNow(now = new Date()) {
    try {
      const expiredResult = await processExpiredPolls(now);
      if (expiredResult.closedCount > 0) {
        logger.info(`[Poll Cron] Auto-closed ${expiredResult.closedCount} expired polls.`);
      }

      const alertResult = await processClosingSoonPolls(now);
      if (alertResult.alertedCount > 0) {
        logger.info(`[Poll Cron] Sent closing-soon alerts for ${alertResult.alertedCount} polls.`);
      }

      return {
        expired: expiredResult,
        alerts: alertResult
      };
    } catch (error) {
      logger.error('[Poll Cron] Error during poll lifecycle automation run:', error);
      throw error;
    }
  }
}

export default new PollCron();
