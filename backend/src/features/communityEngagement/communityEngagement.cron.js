import cron from 'node-cron';
import logger from '../../utils/logger.utils.js';
import noticeBoardService from '../noticeBoard/noticeBoard.service.js';
import * as pollService from '../poll/poll.services.js';

export class CommunityEngagementCron {
  /**
   * @param {Object} [deps={}]
   * @param {Object} [deps.noticeService]
   * @param {Object} [deps.pollService]
   */
  constructor(deps = {}) {
    this.noticeService = deps.noticeService || noticeBoardService;
    this.pollService = deps.pollService || pollService;
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Initializes the authoritative scheduled cron job for Community Engagement.
   * Idempotent: repeated calls do not create duplicate cron timers.
   *
   * @param {string} [cronExpression='* /5 * * * *'] - Cron interval (default every 5 mins)
   * @returns {Object} Active cron task
   */
  init(cronExpression = '*/5 * * * *') {
    if (this.task) {
      logger.warn('[CommunityEngagement Cron] Scheduler already initialized. Skipping duplicate registration.');
      return this.task;
    }

    this.task = cron.schedule(cronExpression, async () => {
      if (this.isRunning) {
        logger.warn('[CommunityEngagement Cron] Previous cycle still in progress. Skipping tick.');
        return;
      }
      this.isRunning = true;
      try {
        await this.runNow();
      } catch (err) {
        logger.error('[CommunityEngagement Cron] Scheduled tick failed:', err);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info(`[CommunityEngagement Cron] Initialized background schedule (${cronExpression}).`);
    return this.task;
  }

  /**
   * Stops the active cron schedule if running.
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('[CommunityEngagement Cron] Background schedule stopped.');
    }
  }

  /**
   * Orchestrates Notice lifecycle processing by delegating to NoticeBoardService.
   * Catches errors locally to guarantee failure isolation from Poll processing.
   *
   * @param {Date} [now=new Date()]
   * @returns {Promise<Object>}
   */
  async processNoticeLifecycle(now = new Date()) {
    try {
      // 1. Scheduled -> Published
      const scheduledResult = await this.noticeService.processScheduledNotices(now);
      if (scheduledResult?.processedCount > 0) {
        logger.info(`[CommunityEngagement Cron] Published ${scheduledResult.processedCount} scheduled notices.`);
      }

      // 2. Published -> Expired
      const expiredResult = await this.noticeService.processExpiredNotices(now);
      if (expiredResult?.expiredCount > 0) {
        logger.info(`[CommunityEngagement Cron] Expired ${expiredResult.expiredCount} past-due notices.`);
      }

      // 3. Acknowledgement reminders
      const ackResult = await this.noticeService.processAcknowledgementDeadlines(now);
      if (ackResult?.remindedCount > 0) {
        logger.info(`[CommunityEngagement Cron] Sent reminders for ${ackResult.remindedCount} critical notices.`);
      }

      return {
        success: true,
        scheduled: scheduledResult || { processedCount: 0, notices: [] },
        expired: expiredResult || { expiredCount: 0, notices: [] },
        acknowledgements: ackResult || { remindedCount: 0, notices: [] },
      };
    } catch (error) {
      logger.error('[CommunityEngagement Cron] Error during Notice lifecycle automation:', error);
      return {
        success: false,
        error: error.message,
        scheduled: { processedCount: 0, notices: [] },
        expired: { expiredCount: 0, notices: [] },
        acknowledgements: { remindedCount: 0, notices: [] },
      };
    }
  }

  /**
   * Orchestrates Poll lifecycle processing by delegating to PollService.
   * Catches errors locally to guarantee failure isolation from Notice processing.
   *
   * @param {Date} [now=new Date()]
   * @returns {Promise<Object>}
   */
  async processPollLifecycle(now = new Date()) {
    try {
      // 1. Scheduled -> Active
      const scheduledResult = await this.pollService.processScheduledPolls(now);
      if (scheduledResult?.activatedCount > 0) {
        logger.info(`[CommunityEngagement Cron] Auto-activated ${scheduledResult.activatedCount} scheduled polls.`);
      }

      // 2. Active -> Closed (computes quorum & outcome)
      const expiredResult = await this.pollService.processExpiredPolls(now);
      if (expiredResult?.closedCount > 0) {
        logger.info(`[CommunityEngagement Cron] Auto-closed ${expiredResult.closedCount} expired polls.`);
      }

      // 3. Closing-soon alerts
      const alertResult = await this.pollService.processClosingSoonPolls(now);
      if (alertResult?.alertedCount > 0) {
        logger.info(`[CommunityEngagement Cron] Sent closing-soon alerts for ${alertResult.alertedCount} polls.`);
      }

      return {
        success: true,
        scheduled: scheduledResult || { activatedCount: 0, polls: [] },
        expired: expiredResult || { closedCount: 0, polls: [] },
        alerts: alertResult || { alertedCount: 0, polls: [] },
      };
    } catch (error) {
      logger.error('[CommunityEngagement Cron] Error during Poll lifecycle automation:', error);
      return {
        success: false,
        error: error.message,
        scheduled: { activatedCount: 0, polls: [] },
        expired: { closedCount: 0, polls: [] },
        alerts: { alertedCount: 0, polls: [] },
      };
    }
  }

  /**
   * Master execution tick. Runs Notice and Poll lifecycle sweeps with overlap protection and failure isolation.
   *
   * @param {Date} [now=new Date()]
   * @returns {Promise<Object>} Aggregated execution summary
   */
  async runNow(now = new Date()) {
    if (this.isRunning) {
      logger.warn('[CommunityEngagement Cron] Execution cycle already in progress.');
      return { skipped: true, reason: 'Already running' };
    }

    this.isRunning = true;
    try {
      logger.info('[CommunityEngagement Cron] Starting unified lifecycle execution cycle...');

      // Execute both domain lifecycles using Promise.allSettled to guarantee strict failure isolation
      const [noticeSettled, pollSettled] = await Promise.allSettled([
        this.processNoticeLifecycle(now),
        this.processPollLifecycle(now),
      ]);

      const noticeResults =
        noticeSettled.status === 'fulfilled'
          ? noticeSettled.value
          : {
              success: false,
              error: noticeSettled.reason?.message,
              scheduled: { processedCount: 0, notices: [] },
              expired: { expiredCount: 0, notices: [] },
              acknowledgements: { remindedCount: 0, notices: [] },
            };

      const pollResults =
        pollSettled.status === 'fulfilled'
          ? pollSettled.value
          : {
              success: false,
              error: pollSettled.reason?.message,
              scheduled: { activatedCount: 0, polls: [] },
              expired: { closedCount: 0, polls: [] },
              alerts: { alertedCount: 0, polls: [] },
            };

      const summary = {
        executedAt: now.toISOString(),
        notice: noticeResults,
        poll: pollResults,
        summary: {
          noticesPublished: noticeResults.scheduled?.processedCount || 0,
          noticesExpired: noticeResults.expired?.expiredCount || 0,
          noticeReminders: noticeResults.acknowledgements?.remindedCount || 0,
          pollsActivated: pollResults.scheduled?.activatedCount || 0,
          pollsClosed: pollResults.expired?.closedCount || 0,
          pollAlerts: pollResults.alerts?.alertedCount || 0,
          errors: [
            ...(noticeResults.error ? [`Notice: ${noticeResults.error}`] : []),
            ...(pollResults.error ? [`Poll: ${pollResults.error}`] : []),
          ],
        },
      };

      logger.info(
        `[CommunityEngagement Cron] Completed cycle: ` +
          `Notices (pub=${summary.summary.noticesPublished}, exp=${summary.summary.noticesExpired}, rem=${summary.summary.noticeReminders}), ` +
          `Polls (act=${summary.summary.pollsActivated}, cls=${summary.summary.pollsClosed}, alt=${summary.summary.pollAlerts})`
      );

      return summary;
    } finally {
      this.isRunning = false;
    }
  }
}

export const communityEngagementCron = new CommunityEngagementCron();
export default communityEngagementCron;
