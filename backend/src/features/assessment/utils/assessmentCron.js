import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import assessmentService from '../assessment.services.js';
import logger, { loggerStorage } from '../../../utils/logger.utils.js';

class AssessmentCron {
  /**
   * Helper to check if a Date is the last day of its calendar month.
   * @param {Date} date
   * @returns {boolean}
   */
  isLastDayOfMonth(date) {
    const tomorrow = new Date(date);
    tomorrow.setUTCDate(date.getUTCDate() + 1);
    return tomorrow.getUTCMonth() !== date.getUTCMonth();
  }

  /**
   * Initialize daily cron task running at 00:00 UTC.
   */
  init() {
    logger.info('Initializing Assessment / Billing Auto-Generation Cron Scheduler...');

    // Run daily at 00:00 UTC: '0 0 * * *'
    cron.schedule('0 0 * * *', async () => {
      const cronRequestId = `cron-billing-${uuidv4()}`;

      await loggerStorage.run(cronRequestId, async () => {
        logger.info('Auto-Billing Assessment execution trigger started...');
        try {
          const now = new Date();
          const currentDay = now.getUTCDate();
          const isLastDay = this.isLastDayOfMonth(now);

          logger.info(`Cron runtime parameters resolved: day=${currentDay}, isLastDayOfMonth=${isLastDay}`);

          // 1. Run standard recurring assessments matching today's day number
          const standardStats = await assessmentService.executeScheduledAssessments(currentDay);
          logger.info('Standard recurring billing execution stats:', standardStats);

          // 2. Prevent 31st Month Cron Trap: execute LAST_DAY_OF_MONTH if applicable
          if (isLastDay) {
            logger.info('Today is the last day of the calendar month. Triggering last day assessments...');
            const lastDayStats = await assessmentService.executeScheduledAssessments('LAST_DAY_OF_MONTH');
            logger.info('Last day recurring billing execution stats:', lastDayStats);
          }

          // 3. Run weekly recurring assessments matching today's day of week (0 = Sunday ... 6 = Saturday)
          const currentDayOfWeek = now.getUTCDay();
          const weeklyStats = await assessmentService.executeScheduledWeeklyAssessments(currentDayOfWeek);
          logger.info('Weekly recurring billing execution stats:', weeklyStats);

          logger.info('Auto-Billing Assessment execution trigger finished successfully.');
        } catch (error) {
          logger.error('CRITICAL: Cron Billing Scheduler execution failed:', {
            error: error.message,
            stack: error.stack,
          });
        }
      });
    });
  }
}

export default new AssessmentCron();
