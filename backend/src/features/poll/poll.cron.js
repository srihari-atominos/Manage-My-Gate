import cron from 'node-cron';
import logger from '../../utils/logger.utils.js';
import { processScheduledPolls, processExpiredPolls, processClosingSoonPolls } from './poll.services.js';

class PollCron {
  init() {
    // Deprecated: Consolidated under CommunityEngagementCron.
    // Does not register a duplicate node-cron timer.
    logger.info('[Poll Cron] Deprecated: Poll lifecycle scheduling is orchestrated by CommunityEngagementCron.');
  }

  async runNow(now = new Date()) {
    try {
      // 1. Auto-activate scheduled polls whose start time has arrived
      const scheduledResult = await processScheduledPolls(now);
      if (scheduledResult.activatedCount > 0) {
        logger.info(`[Poll Cron] Auto-activated ${scheduledResult.activatedCount} scheduled polls.`);
      }

      // 2. Auto-close expired polls
      const expiredResult = await processExpiredPolls(now);
      if (expiredResult.closedCount > 0) {
        logger.info(`[Poll Cron] Auto-closed ${expiredResult.closedCount} expired polls.`);
      }

      // 3. Send closing-soon alerts
      const alertResult = await processClosingSoonPolls(now);
      if (alertResult.alertedCount > 0) {
        logger.info(`[Poll Cron] Sent closing-soon alerts for ${alertResult.alertedCount} polls.`);
      }

      return {
        scheduled: scheduledResult,
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
