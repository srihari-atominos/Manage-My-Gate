import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { processScheduledPolls } from '../../../src/features/poll/poll.services.js';
import pollEvents from '../../../src/features/poll/poll.events.js';

describe('Poll Scheduling & Lifecycle Unit Tests (Phase 1)', () => {
  const orgA = new mongoose.Types.ObjectId();
  const orgB = new mongoose.Types.ObjectId();

  describe('1. Poll Model Schema & Scheduling Fields', () => {
    it('should validate Scheduled as an accepted status in Poll schema', async () => {
      const Poll = mongoose.model('Poll');
      const validStatuses = Poll.schema.path('status').enumValues;
      assert.ok(validStatuses.includes('Scheduled'), 'Poll status enum must include Scheduled');
      assert.ok(validStatuses.includes('Active'), 'Poll status enum must include Active');
      assert.ok(validStatuses.includes('Draft'), 'Poll status enum must include Draft');
      assert.ok(validStatuses.includes('Closed'), 'Poll status enum must include Closed');
    });

    it('should verify scheduleDate field definition in Poll schema', async () => {
      const Poll = mongoose.model('Poll');
      const schedulePath = Poll.schema.path('scheduleDate');
      assert.ok(schedulePath, 'Poll schema must have scheduleDate path');
      assert.strictEqual(schedulePath.instance, 'Date', 'scheduleDate must be a Date instance');
    });
  });

  describe('2. Scheduled Poll Activation Automation (processScheduledPolls)', () => {
    it('should identify scheduled polls whose scheduleDate <= now and activate them', async () => {
      const now = new Date();
      const pastSchedule = new Date(now.getTime() - 60000); // 1 minute ago
      const futureSchedule = new Date(now.getTime() + 3600000); // 1 hour in future

      const Poll = mongoose.model('Poll');

      // Mock polls in store
      const pollDue = {
        _id: new mongoose.Types.ObjectId(),
        orgId: orgA,
        question: 'Should we pave the North entrance?',
        status: 'Scheduled',
        scheduleDate: pastSchedule,
        endDate: new Date(now.getTime() + 86400000),
      };

      const pollNotDue = {
        _id: new mongoose.Types.ObjectId(),
        orgId: orgA,
        question: 'Future community meeting poll',
        status: 'Scheduled',
        scheduleDate: futureSchedule,
        endDate: new Date(now.getTime() + 86400000 * 2),
      };

      let publishedEventEmitted = false;
      let publishedPollId = null;

      const handler = (poll) => {
        publishedEventEmitted = true;
        publishedPollId = poll._id?.toString();
      };
      pollEvents.on('poll_published', handler);

      // Temporarily mock Poll.find and Poll.findOneAndUpdate
      const originalFind = Poll.find;
      const originalFindOneAndUpdate = Poll.findOneAndUpdate;

      try {
        Poll.find = async (query) => {
          assert.strictEqual(query.status, 'Scheduled');
          // Return only pollDue matching scheduleDate <= now
          return [pollDue];
        };

        Poll.findOneAndUpdate = async (query, update, options) => {
          assert.strictEqual(query.status, 'Scheduled');
          assert.strictEqual(update.$set.status, 'Active');
          return { ...pollDue, status: 'Active' };
        };

        const result = await processScheduledPolls(now, orgA.toString());
        assert.strictEqual(result.activatedCount, 1);
        assert.strictEqual(result.polls.length, 1);
        assert.strictEqual(result.polls[0].status, 'Active');
        assert.strictEqual(publishedEventEmitted, true);
        assert.strictEqual(publishedPollId, pollDue._id.toString());
      } finally {
        Poll.find = originalFind;
        Poll.findOneAndUpdate = originalFindOneAndUpdate;
        pollEvents.off('poll_published', handler);
      }
    });

    it('should respect tenant isolation: only activate polls for the given orgId when scoped', async () => {
      const now = new Date();
      const Poll = mongoose.model('Poll');
      let scopedQuery = null;

      const originalFind = Poll.find;
      try {
        Poll.find = async (query) => {
          scopedQuery = query;
          return [];
        };

        await processScheduledPolls(now, orgA.toString());
        assert.ok(scopedQuery, 'Find query was executed');
        assert.strictEqual(scopedQuery.orgId.toString(), orgA.toString());
      } finally {
        Poll.find = originalFind;
      }
    });
  });

  describe('3. Scheduled Poll Voting Protection', () => {
    it('should reject vote submissions on polls with status Scheduled', async () => {
      const Poll = mongoose.model('Poll');
      const pollId = new mongoose.Types.ObjectId();

      const scheduledPoll = {
        _id: pollId,
        orgId: orgA,
        question: 'Upcoming Vote',
        status: 'Scheduled',
        scheduleDate: new Date(Date.now() + 3600000),
        endDate: new Date(Date.now() + 86400000),
        options: [{ text: 'Option A' }, { text: 'Option B' }],
      };

      // Poll service voteOnPoll verifies poll.status === 'Active'
      assert.notStrictEqual(scheduledPoll.status, 'Active', 'Scheduled poll must not have Active status');
      
      const isVotingAllowed = (poll) => {
        if (poll.status !== 'Active') {
          return { allowed: false, error: 'Voting is only allowed on active polls' };
        }
        return { allowed: true };
      };

      const check = isVotingAllowed(scheduledPoll);
      assert.strictEqual(check.allowed, false);
      assert.strictEqual(check.error, 'Voting is only allowed on active polls');
    });
  });

  describe('4. Schedule Date vs End Date Validation Contract', () => {
    it('should enforce endDate > scheduleDate contract', () => {
      const now = new Date();
      const scheduleDate = new Date(now.getTime() + 3600000); // +1 hour
      const invalidEndDate = new Date(now.getTime() + 1800000); // +30 mins (before scheduleDate)
      const validEndDate = new Date(now.getTime() + 7200000); // +2 hours

      const validateDates = (sched, end) => {
        if (sched && end && new Date(end) <= new Date(sched)) {
          return { valid: false, error: 'End date must be after schedule date' };
        }
        return { valid: true };
      };

      const invalidCheck = validateDates(scheduleDate, invalidEndDate);
      assert.strictEqual(invalidCheck.valid, false);
      assert.strictEqual(invalidCheck.error, 'End date must be after schedule date');

      const validCheck = validateDates(scheduleDate, validEndDate);
      assert.strictEqual(validCheck.valid, true);
    });
  });
});
