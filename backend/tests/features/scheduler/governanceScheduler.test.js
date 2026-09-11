import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import noticeBoardService from '../../../src/features/noticeBoard/noticeBoard.service.js';
import noticeEvents from '../../../src/features/noticeBoard/noticeBoard.events.js';
import noticeBoardCron from '../../../src/features/noticeBoard/noticeBoard.cron.js';
import * as pollService from '../../../src/features/poll/poll.services.js';
import pollEvents from '../../../src/features/poll/poll.events.js';
import pollCron from '../../../src/features/poll/poll.cron.js';
import Notice from '../../../src/features/noticeBoard/noticeBoard.model.js';
import Poll from '../../../src/features/poll/poll.model.js';

describe('Phase 5: Background Governance Scheduler & Expiry Automation Tests', () => {
  const orgId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  describe('1. Notice Scheduled Auto-Publishing', () => {
    it('should auto-publish scheduled notices whose scheduleDate has arrived', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create in-memory mock for find, findOneAndUpdate, and updateMany
      const originalFind = Notice.find;
      const originalFindOneAndUpdate = Notice.findOneAndUpdate;
      const originalUpdateMany = Notice.updateMany;

      const mockScheduledNotice = {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        title: 'Water Maintenance Notice',
        status: 'Scheduled',
        scheduleDate: pastDate,
        expiryDate,
        isPinned: true,
        createdBy: userId,
      };

      let publishedEventFired = false;
      const listener = (notice) => {
        if (notice._id.toString() === mockScheduledNotice._id.toString()) {
          publishedEventFired = true;
        }
      };
      noticeEvents.on('NOTICE_PUBLISHED', listener);

      try {
        Notice.find = async (query) => {
          if (query.status === 'Scheduled') {
            return [mockScheduledNotice];
          }
          return [];
        };

        Notice.findOneAndUpdate = async (filter, update) => {
          if (filter._id.toString() === mockScheduledNotice._id.toString() && filter.status === 'Scheduled') {
            return {
              ...mockScheduledNotice,
              status: update.$set.status,
            };
          }
          return null;
        };

        Notice.updateMany = async () => ({ modifiedCount: 1 });

        const result = await noticeBoardService.processScheduledNotices(new Date());

        assert.strictEqual(result.processedCount, 1);
        assert.strictEqual(result.notices[0].status, 'Published');
        assert.strictEqual(publishedEventFired, true);
      } finally {
        Notice.find = originalFind;
        Notice.findOneAndUpdate = originalFindOneAndUpdate;
        Notice.updateMany = originalUpdateMany;
        noticeEvents.off('NOTICE_PUBLISHED', listener);
      }
    });

    it('should not publish notices whose scheduleDate is still in the future', async () => {
      const originalFind = Notice.find;
      try {
        Notice.find = async () => [];

        const result = await noticeBoardService.processScheduledNotices(new Date());
        assert.strictEqual(result.processedCount, 0);
      } finally {
        Notice.find = originalFind;
      }
    });
  });

  describe('2. Notice Auto-Expiry & Unpinning', () => {
    it('should transition published notices to Expired and unpin them once expiryDate has passed', async () => {
      const pastExpiryDate = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago

      const originalFind = Notice.find;
      const originalFindOneAndUpdate = Notice.findOneAndUpdate;

      const mockPublishedNotice = {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        title: 'Old Community Notice',
        status: 'Published',
        expiryDate: pastExpiryDate,
        isPinned: true,
      };

      let expiredEventFired = false;
      const listener = (notice) => {
        if (notice._id.toString() === mockPublishedNotice._id.toString()) {
          expiredEventFired = true;
        }
      };
      noticeEvents.on('NOTICE_EXPIRED', listener);

      try {
        Notice.find = async (query) => {
          if (query.status === 'Published') {
            return [mockPublishedNotice];
          }
          return [];
        };

        Notice.findOneAndUpdate = async (filter, update) => {
          if (filter._id.toString() === mockPublishedNotice._id.toString() && filter.status === 'Published') {
            return {
              ...mockPublishedNotice,
              status: update.$set.status,
              isPinned: update.$set.isPinned,
            };
          }
          return null;
        };

        const result = await noticeBoardService.processExpiredNotices(new Date());

        assert.strictEqual(result.expiredCount, 1);
        assert.strictEqual(result.notices[0].status, 'Expired');
        assert.strictEqual(result.notices[0].isPinned, false);
        assert.strictEqual(expiredEventFired, true);
      } finally {
        Notice.find = originalFind;
        Notice.findOneAndUpdate = originalFindOneAndUpdate;
        noticeEvents.off('NOTICE_EXPIRED', listener);
      }
    });
  });

  describe('3. Critical Notice Acknowledgement Reminders', () => {
    it('should scan and emit reminder events for notices approaching acknowledgement deadline', async () => {
      const originalFind = Notice.find;
      const deadlineSoon = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours away

      const mockCriticalNotice = {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        title: 'Urgent Fire Safety Drill',
        status: 'Published',
        isCritical: true,
        requiresAcknowledgement: true,
        acknowledgementDeadline: deadlineSoon,
      };

      let reminderEventFired = false;
      let reminderPayload = null;
      const listener = (payload) => {
        if (payload.noticeId.toString() === mockCriticalNotice._id.toString()) {
          reminderEventFired = true;
          reminderPayload = payload;
        }
      };
      noticeEvents.on('NOTICE_ACKNOWLEDGEMENT_REMINDER', listener);

      try {
        Notice.find = async () => [mockCriticalNotice];

        const result = await noticeBoardService.processAcknowledgementDeadlines(new Date());

        assert.strictEqual(result.remindedCount, 1);
        assert.strictEqual(reminderEventFired, true);
        assert.strictEqual(reminderPayload.isPastDeadline, false);
        assert.strictEqual(reminderPayload.noticeId.toString(), mockCriticalNotice._id.toString());
      } finally {
        Notice.find = originalFind;
        noticeEvents.off('NOTICE_ACKNOWLEDGEMENT_REMINDER', listener);
      }
    });
  });

  describe('4. Poll Auto-Close & Outcome Calculation', () => {
    it('should auto-close expired active polls and compute quorum outcome', async () => {
      const originalFind = Poll.find;
      const originalFindOneAndUpdate = Poll.findOneAndUpdate;

      const pastDate = new Date(Date.now() - 10 * 60 * 1000);

      const mockActivePoll = {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        question: 'Adopt Solar Power?',
        status: 'Active',
        endDate: pastDate,
        quorumPercentage: 50,
        totalEligibleVoters: 10,
        totalVotes: 6,
        options: [
          { text: 'Yes', votesCount: 5 },
          { text: 'No', votesCount: 1 },
        ],
      };

      let pollClosedEventFired = false;
      const listener = (poll) => {
        if (poll._id.toString() === mockActivePoll._id.toString()) {
          pollClosedEventFired = true;
        }
      };
      pollEvents.on('poll_closed', listener);

      try {
        Poll.find = async (query) => {
          if (query.status === 'Active') {
            return [mockActivePoll];
          }
          return [];
        };

        Poll.findOneAndUpdate = async (filter, update) => {
          if (filter._id.toString() === mockActivePoll._id.toString() && filter.status === 'Active') {
            return {
              ...mockActivePoll,
              status: update.$set.status,
              closedAt: update.$set.closedAt,
              outcome: update.$set.outcome,
              winningOption: update.$set.winningOption,
            };
          }
          return null;
        };

        const result = await pollService.processExpiredPolls(new Date());

        assert.strictEqual(result.closedCount, 1);
        assert.strictEqual(result.polls[0].status, 'Closed');
        assert.strictEqual(result.polls[0].outcome, 'PASSED');
        assert.strictEqual(result.polls[0].winningOption.text, 'Yes');
        assert.strictEqual(pollClosedEventFired, true);
      } finally {
        Poll.find = originalFind;
        Poll.findOneAndUpdate = originalFindOneAndUpdate;
        pollEvents.off('poll_closed', listener);
      }
    });

    it('should mark outcome as NO_QUORUM if expired poll lacked required quorum', async () => {
      const originalFind = Poll.find;
      const originalFindOneAndUpdate = Poll.findOneAndUpdate;

      const pastDate = new Date(Date.now() - 10 * 60 * 1000);

      const mockLowQuorumPoll = {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        question: 'Change Clubhouse Rules?',
        status: 'Active',
        endDate: pastDate,
        quorumPercentage: 60, // requires 6 votes out of 10
        totalEligibleVoters: 10,
        totalVotes: 2, // only 2 votes cast
        options: [
          { text: 'Yes', votesCount: 2 },
          { text: 'No', votesCount: 0 },
        ],
      };

      try {
        Poll.find = async () => [mockLowQuorumPoll];
        Poll.findOneAndUpdate = async (filter, update) => ({
          ...mockLowQuorumPoll,
          status: update.$set.status,
          outcome: update.$set.outcome,
        });

        const result = await pollService.processExpiredPolls(new Date());

        assert.strictEqual(result.closedCount, 1);
        assert.strictEqual(result.polls[0].outcome, 'NO_QUORUM');
      } finally {
        Poll.find = originalFind;
        Poll.findOneAndUpdate = originalFindOneAndUpdate;
      }
    });
  });

  describe('5. Poll Closing-Soon Alerts', () => {
    it('should scan and emit poll_closing_soon event for polls closing in ~24 hours', async () => {
      const originalFind = Poll.find;
      const closingIn24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const mockClosingPoll = {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        question: 'Annual Landscaping Vote',
        status: 'Active',
        endDate: closingIn24h,
      };

      let closingSoonEventFired = false;
      const listener = (poll) => {
        if (poll._id.toString() === mockClosingPoll._id.toString()) {
          closingSoonEventFired = true;
        }
      };
      pollEvents.on('poll_closing_soon', listener);

      try {
        Poll.find = async () => [mockClosingPoll];

        const result = await pollService.processClosingSoonPolls(new Date());

        assert.strictEqual(result.alertedCount, 1);
        assert.strictEqual(closingSoonEventFired, true);
      } finally {
        Poll.find = originalFind;
        pollEvents.off('poll_closing_soon', listener);
      }
    });
  });

  describe('6. Cron Runner Manual Execution (runNow)', () => {
    it('should execute noticeBoardCron.runNow() without errors', async () => {
      const originalFind = Notice.find;
      try {
        Notice.find = async () => [];
        const result = await noticeBoardCron.runNow();
        assert.ok(result);
        assert.strictEqual(result.scheduled.processedCount, 0);
        assert.strictEqual(result.expired.expiredCount, 0);
        assert.strictEqual(result.acknowledgements.remindedCount, 0);
      } finally {
        Notice.find = originalFind;
      }
    });

    it('should execute pollCron.runNow() without errors', async () => {
      const originalFind = Poll.find;
      try {
        Poll.find = async () => [];
        const result = await pollCron.runNow();
        assert.ok(result);
        assert.strictEqual(result.expired.closedCount, 0);
        assert.strictEqual(result.alerts.alertedCount, 0);
      } finally {
        Poll.find = originalFind;
      }
    });
  });
});
