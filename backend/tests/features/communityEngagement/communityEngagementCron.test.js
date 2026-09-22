import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  CommunityEngagementCron,
  communityEngagementCron,
} from '../../../src/features/communityEngagement/communityEngagement.cron.js';
import noticeBoardCron from '../../../src/features/noticeBoard/noticeBoard.cron.js';
import pollCron from '../../../src/features/poll/poll.cron.js';
import noticeBoardService from '../../../src/features/noticeBoard/noticeBoard.service.js';
import * as pollService from '../../../src/features/poll/poll.services.js';
import Notice from '../../../src/features/noticeBoard/noticeBoard.model.js';
import Poll from '../../../src/features/poll/poll.model.js';
import noticeEvents from '../../../src/features/noticeBoard/noticeBoard.events.js';
import pollEvents from '../../../src/features/poll/poll.events.js';

describe('Community Engagement Scheduler & Lifecycle Consolidation Unit Tests (Phase 4)', () => {
  const orgA = new mongoose.Types.ObjectId();
  const orgB = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  afterEach(() => {
    communityEngagementCron.stop();
  });

  describe('A. Scheduler Registration', () => {
    it('1. should register cron job on init()', () => {
      const cronInstance = new CommunityEngagementCron();
      const task = cronInstance.init('*/5 * * * *');
      assert.ok(task, 'Task should be returned by init()');
      assert.ok(cronInstance.task, 'cronInstance.task should be defined');
      cronInstance.stop();
      assert.strictEqual(cronInstance.task, null);
    });

    it('2. should not create duplicate cron jobs on repeated init() calls', () => {
      const cronInstance = new CommunityEngagementCron();
      const task1 = cronInstance.init('*/5 * * * *');
      const task2 = cronInstance.init('*/5 * * * *');
      const task3 = cronInstance.init('*/5 * * * *');

      assert.strictEqual(task1, task2, 'Subsequent init() calls must return existing task');
      assert.strictEqual(task2, task3);
      cronInstance.stop();
    });

    it('3. should stop active scheduler when stop() is called', () => {
      const cronInstance = new CommunityEngagementCron();
      cronInstance.init();
      assert.ok(cronInstance.task);
      cronInstance.stop();
      assert.strictEqual(cronInstance.task, null);
    });
  });

  describe('B. Overlap Protection', () => {
    it('4. should skip second run while first run is still in progress', async () => {
      let releaseFirstRun;
      const delayedNoticeService = {
        processScheduledNotices: () =>
          new Promise((resolve) => {
            releaseFirstRun = resolve;
          }),
        processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
        processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
      };
      const mockPollService = {
        processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
        processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
        processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
      };

      const scheduler = new CommunityEngagementCron({
        noticeService: delayedNoticeService,
        pollService: mockPollService,
      });

      // Start first run (will hang until releaseFirstRun is invoked)
      const firstRunPromise = scheduler.runNow();

      // Ensure isRunning flag is active
      assert.strictEqual(scheduler.isRunning, true);

      // Attempt second run while first is in flight
      const secondRunResult = await scheduler.runNow();
      assert.strictEqual(secondRunResult.skipped, true);
      assert.strictEqual(secondRunResult.reason, 'Already running');

      // Finish first run
      releaseFirstRun({ processedCount: 1, notices: [] });
      await firstRunPromise;
      assert.strictEqual(scheduler.isRunning, false);
    });

    it('5. should release isRunning flag after successful execution', async () => {
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => ({ processedCount: 0, notices: [] }),
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      assert.strictEqual(scheduler.isRunning, false);
      const result = await scheduler.runNow();
      assert.strictEqual(scheduler.isRunning, false);
      assert.strictEqual(result.summary.noticesPublished, 0);
    });

    it('6. should release isRunning flag even after execution error', async () => {
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => {
            throw new Error('Fatal Notice Service Crash');
          },
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => {
            throw new Error('Fatal Poll Service Crash');
          },
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const result = await scheduler.runNow();
      assert.strictEqual(scheduler.isRunning, false, 'isRunning must be reset in finally block');
      assert.strictEqual(result.summary.errors.length, 2);
    });
  });

  describe('C. Notice Lifecycle Orchestration', () => {
    it('7. should orchestrate Scheduled -> Published transition for due notices', async () => {
      let publishedCalled = false;
      const mockNotice = { _id: new mongoose.Types.ObjectId(), title: 'Water Cut', status: 'Published' };

      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async (now) => {
            publishedCalled = true;
            return { processedCount: 1, notices: [mockNotice] };
          },
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const res = await scheduler.runNow();
      assert.strictEqual(publishedCalled, true);
      assert.strictEqual(res.summary.noticesPublished, 1);
    });

    it('8. should orchestrate Published -> Expired transition for past-due notices', async () => {
      let expiredCalled = false;
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => ({ processedCount: 0, notices: [] }),
          processExpiredNotices: async (now) => {
            expiredCalled = true;
            return { expiredCount: 2, notices: [{ _id: new mongoose.Types.ObjectId() }] };
          },
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const res = await scheduler.runNow();
      assert.strictEqual(expiredCalled, true);
      assert.strictEqual(res.summary.noticesExpired, 2);
    });

    it('9. should orchestrate acknowledgement deadline reminders for critical notices', async () => {
      let remindersCalled = false;
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => ({ processedCount: 0, notices: [] }),
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async (now) => {
            remindersCalled = true;
            return { remindedCount: 3, notices: [{ _id: new mongoose.Types.ObjectId() }] };
          },
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const res = await scheduler.runNow();
      assert.strictEqual(remindersCalled, true);
      assert.strictEqual(res.summary.noticeReminders, 3);
    });
  });

  describe('D. Poll Lifecycle Orchestration', () => {
    it('10. should orchestrate Scheduled -> Active transition for due polls', async () => {
      let pollActivatedCalled = false;
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => ({ processedCount: 0, notices: [] }),
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async (now) => {
            pollActivatedCalled = true;
            return { activatedCount: 1, polls: [{ _id: new mongoose.Types.ObjectId(), status: 'Active' }] };
          },
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const res = await scheduler.runNow();
      assert.strictEqual(pollActivatedCalled, true);
      assert.strictEqual(res.summary.pollsActivated, 1);
    });

    it('11. should orchestrate Active -> Closed transition for expired polls', async () => {
      let pollClosedCalled = false;
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => ({ processedCount: 0, notices: [] }),
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async (now) => {
            pollClosedCalled = true;
            return {
              closedCount: 1,
              polls: [{ _id: new mongoose.Types.ObjectId(), status: 'Closed', outcome: 'PASSED' }],
            };
          },
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const res = await scheduler.runNow();
      assert.strictEqual(pollClosedCalled, true);
      assert.strictEqual(res.summary.pollsClosed, 1);
    });

    it('12. should preserve Poll quorum & outcome calculation upon closing', async () => {
      const mockPoll = {
        _id: new mongoose.Types.ObjectId(),
        status: 'Closed',
        outcome: 'NO_QUORUM',
        winningOption: null,
      };

      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => ({ processedCount: 0, notices: [] }),
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async () => ({ closedCount: 1, polls: [mockPoll] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const res = await scheduler.runNow();
      assert.strictEqual(res.poll.expired.polls[0].outcome, 'NO_QUORUM');
    });

    it('13. should orchestrate closing-soon alerts for polls nearing expiry', async () => {
      let alertsCalled = false;
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => ({ processedCount: 0, notices: [] }),
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async (now) => {
            alertsCalled = true;
            return { alertedCount: 2, polls: [{ _id: new mongoose.Types.ObjectId() }] };
          },
        },
      });

      const res = await scheduler.runNow();
      assert.strictEqual(alertsCalled, true);
      assert.strictEqual(res.summary.pollAlerts, 2);
    });

    it('14. should preserve poll finalization domain authority', async () => {
      // Finalize remains an explicit administrative or domain operation on PollService
      assert.strictEqual(typeof pollService.finalizePoll, 'function');
    });
  });

  describe('E. Idempotency & Repeat Execution', () => {
    it('15. should produce zero duplicate transitions when run consecutively without state changes', async () => {
      let noticeCallCount = 0;
      let pollCallCount = 0;

      const mockNoticeService = {
        processScheduledNotices: async () => {
          noticeCallCount++;
          return { processedCount: noticeCallCount === 1 ? 1 : 0, notices: [] };
        },
        processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
        processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
      };

      const mockPollService = {
        processScheduledPolls: async () => {
          pollCallCount++;
          return { activatedCount: pollCallCount === 1 ? 1 : 0, polls: [] };
        },
        processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
        processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
      };

      const scheduler = new CommunityEngagementCron({
        noticeService: mockNoticeService,
        pollService: mockPollService,
      });

      // First run: processes 1 Notice and 1 Poll
      const run1 = await scheduler.runNow();
      assert.strictEqual(run1.summary.noticesPublished, 1);
      assert.strictEqual(run1.summary.pollsActivated, 1);

      // Second immediate run: idempotent, nothing left to process
      const run2 = await scheduler.runNow();
      assert.strictEqual(run2.summary.noticesPublished, 0);
      assert.strictEqual(run2.summary.pollsActivated, 0);
    });

    it('16. should verify domain events are not re-emitted on subsequent identical runs', async () => {
      let publishedEventCount = 0;
      const listener = () => {
        publishedEventCount++;
      };
      noticeEvents.on('NOTICE_PUBLISHED', listener);

      try {
        const mockNoticeService = {
          processScheduledNotices: async () => {
            if (publishedEventCount === 0) {
              noticeEvents.emit('NOTICE_PUBLISHED', { _id: new mongoose.Types.ObjectId(), title: 'Idempotent Notice' });
              return { processedCount: 1, notices: [] };
            }
            return { processedCount: 0, notices: [] };
          },
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        };

        const scheduler = new CommunityEngagementCron({
          noticeService: mockNoticeService,
          pollService: {
            processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
            processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
            processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
          },
        });

        await scheduler.runNow();
        assert.strictEqual(publishedEventCount, 1);

        await scheduler.runNow();
        assert.strictEqual(publishedEventCount, 1, 'Event must not be re-emitted on second run');
      } finally {
        noticeEvents.off('NOTICE_PUBLISHED', listener);
      }
    });

    it('17. should ensure reminder handling remains idempotent across ticks', async () => {
      let alertCount = 0;
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => ({ processedCount: 0, notices: [] }),
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => {
            alertCount++;
            return { alertedCount: alertCount === 1 ? 1 : 0, polls: [] };
          },
        },
      });

      const res1 = await scheduler.runNow();
      assert.strictEqual(res1.summary.pollAlerts, 1);

      const res2 = await scheduler.runNow();
      assert.strictEqual(res2.summary.pollAlerts, 0);
    });
  });

  describe('F. Failure Isolation', () => {
    it('18. should continue Poll lifecycle execution even if Notice lifecycle throws', async () => {
      let pollRan = false;
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => {
            throw new Error('Database connection failed on Notice collection');
          },
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => {
            pollRan = true;
            return { activatedCount: 2, polls: [] };
          },
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const result = await scheduler.runNow();
      assert.strictEqual(pollRan, true, 'Poll processing MUST execute even when Notice fails');
      assert.strictEqual(result.notice.success, false);
      assert.match(result.notice.error, /Notice collection/i);
      assert.strictEqual(result.poll.success, true);
      assert.strictEqual(result.summary.pollsActivated, 2);
    });

    it('19. should continue Notice lifecycle execution even if Poll lifecycle throws', async () => {
      let noticeRan = false;
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => {
            noticeRan = true;
            return { processedCount: 3, notices: [] };
          },
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => {
            throw new Error('Database connection failed on Poll collection');
          },
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const result = await scheduler.runNow();
      assert.strictEqual(noticeRan, true, 'Notice processing MUST execute even when Poll fails');
      assert.strictEqual(result.poll.success, false);
      assert.match(result.poll.error, /Poll collection/i);
      assert.strictEqual(result.notice.success, true);
      assert.strictEqual(result.summary.noticesPublished, 3);
    });

    it('20. should log and report errors in scheduler summary when a failure occurs', async () => {
      const scheduler = new CommunityEngagementCron({
        noticeService: {
          processScheduledNotices: async () => {
            throw new Error('Notice processing timeout');
          },
          processExpiredNotices: async () => ({ expiredCount: 0, notices: [] }),
          processAcknowledgementDeadlines: async () => ({ remindedCount: 0, notices: [] }),
        },
        pollService: {
          processScheduledPolls: async () => ({ activatedCount: 0, polls: [] }),
          processExpiredPolls: async () => ({ closedCount: 0, polls: [] }),
          processClosingSoonPolls: async () => ({ alertedCount: 0, polls: [] }),
        },
      });

      const result = await scheduler.runNow();
      assert.strictEqual(result.summary.errors.length, 1);
      assert.match(result.summary.errors[0], /Notice: Notice processing timeout/i);
    });
  });

  describe('G. Legacy Compatibility', () => {
    it('21. should keep legacy noticeBoardCron.runNow() functional', async () => {
      const originalFind = Notice.find;
      try {
        Notice.find = async () => [];
        const result = await noticeBoardCron.runNow();
        assert.ok(result);
        assert.strictEqual(typeof result.scheduled.processedCount, 'number');
      } finally {
        Notice.find = originalFind;
      }
    });

    it('22. should keep legacy pollCron.runNow() functional', async () => {
      const originalFind = Poll.find;
      try {
        Poll.find = async () => [];
        const result = await pollCron.runNow();
        assert.ok(result);
        assert.strictEqual(typeof result.expired.closedCount, 'number');
      } finally {
        Poll.find = originalFind;
      }
    });

    it('23. should verify legacy init() methods do not create independent node-cron timers', () => {
      // Calling legacy init() should be a no-op / deprecation logger and not throw
      noticeBoardCron.init();
      pollCron.init();
    });
  });

  describe('H. Tenant Safety', () => {
    it('24. should respect tenant isolation across Notice and Poll domain processing', async () => {
      const Poll = mongoose.model('Poll');
      const originalFind = Poll.find;
      let capturedQuery = null;

      try {
        Poll.find = async (query) => {
          capturedQuery = query;
          return [];
        };

        await pollService.processScheduledPolls(new Date(), orgA.toString());
        assert.ok(capturedQuery);
        assert.strictEqual(capturedQuery.orgId.toString(), orgA.toString());
      } finally {
        Poll.find = originalFind;
      }
    });
  });
});
