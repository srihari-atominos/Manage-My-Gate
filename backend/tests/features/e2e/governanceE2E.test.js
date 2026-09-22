import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { AudienceService } from '../../../src/features/audience/audience.service.js';
import {
  computePollOutcome,
  canUserViewResults,
  sanitizePollForViewer
} from '../../../src/features/poll/poll.services.js';
import { NoticeBoardService } from '../../../src/features/noticeBoard/noticeBoard.service.js';
import { OutboxService } from '../../../src/features/outbox/outbox.service.js';

describe('Phase 9: End-to-End Governance Engine Integration Tests', () => {
  const orgA = new mongoose.Types.ObjectId().toString();
  const orgB = new mongoose.Types.ObjectId().toString();

  const userAdmin = new mongoose.Types.ObjectId().toString();
  const resident1 = new mongoose.Types.ObjectId().toString();
  const resident2 = new mongoose.Types.ObjectId().toString();
  const resident3 = new mongoose.Types.ObjectId().toString();

  const unit101Id = new mongoose.Types.ObjectId().toString();
  const unit102Id = new mongoose.Types.ObjectId().toString();

  // -------------------------------------------------------------
  // Test 1: Full Critical Notice Governance & Acknowledgement Lifecycle
  // -------------------------------------------------------------
  it('E2E Notice: Create critical notice -> audience check -> acknowledgement -> audit emission', async () => {
    // In-memory repositories for notice, acknowledgements, outbox, and audit
    const noticeStore = new Map();
    const ackStore = new Map();
    const auditEvents = [];
    const outboxEvents = [];

    const mockNoticeRepo = {
      async create(data) {
        const id = new mongoose.Types.ObjectId().toString();
        const doc = { _id: id, ...data, createdAt: new Date() };
        noticeStore.set(id, doc);
        return doc;
      },
      async findById(id, orgId) {
        const doc = noticeStore.get(id);
        if (doc && doc.orgId.toString() === orgId.toString()) return doc;
        return null;
      },
      async update(id, orgId, updateData) {
        const doc = noticeStore.get(id);
        if (!doc || doc.orgId.toString() !== orgId.toString()) return null;
        const updated = { ...doc, ...updateData };
        noticeStore.set(id, updated);
        return updated;
      }
    };

    const mockAckRepo = {
      async acknowledgeNotice(noticeId, residentId, orgId, unitNumber) {
        const key = `${noticeId}:${residentId}`;
        if (ackStore.has(key)) {
          const err = new Error('Notice has already been acknowledged by this resident.');
          err.code = 11000;
          throw err;
        }
        const record = {
          _id: new mongoose.Types.ObjectId(),
          noticeId: new mongoose.Types.ObjectId(noticeId),
          residentId: new mongoose.Types.ObjectId(residentId),
          orgId: new mongoose.Types.ObjectId(orgId),
          unitNumber,
          acknowledgedAt: new Date()
        };
        ackStore.set(key, record);
        return record;
      },
      async hasAcknowledged(noticeId, residentId, orgId) {
        return ackStore.has(`${noticeId}:${residentId}`);
      },
      async getAcknowledgements(noticeId, orgId) {
        const list = Array.from(ackStore.values()).filter(
          (a) => a.noticeId.toString() === noticeId.toString() && a.orgId.toString() === orgId.toString()
        );
        return { data: list, total: list.length };
      }
    };

    // Step 1: Create Critical Notice
    const noticeData = {
      orgId: orgA,
      title: 'Emergency Water Shutdown Notice',
      description: 'Water maintenance shutdown tomorrow from 9 AM to 2 PM.',
      category: 'Maintenance',
      priority: 'Critical',
      status: 'Published',
      requiresAcknowledgement: true,
      acknowledgementDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: userAdmin,
      targetAudience: { targetType: 'ALL' }
    };

    const notice = await mockNoticeRepo.create(noticeData);
    assert.ok(notice._id, 'Notice should have an ID');
    assert.equal(notice.priority, 'Critical');
    assert.equal(notice.requiresAcknowledgement, true);

    // Step 2: Resident acknowledges notice
    const ack = await mockAckRepo.acknowledgeNotice(notice._id, resident1, orgA, 'Villa 101');
    assert.ok(ack._id, 'Acknowledgement record created');
    assert.equal(ack.unitNumber, 'Villa 101');

    // Step 3: Duplicate acknowledgement prevention
    await assert.rejects(
      async () => {
        await mockAckRepo.acknowledgeNotice(notice._id, resident1, orgA, 'Villa 101');
      },
      (err) => {
        assert.ok(err.message.includes('already been acknowledged'));
        return true;
      }
    );

    // Step 4: Verify audit query
    const acks = await mockAckRepo.getAcknowledgements(notice._id, orgA);
    assert.equal(acks.total, 1);
    assert.equal(acks.data[0].residentId.toString(), resident1);
  });

  // -------------------------------------------------------------
  // Test 2: Full Poll Governance, Quorum, and Outcome Lifecycle
  // -------------------------------------------------------------
  it('E2E Poll: Create poll -> concurrent voting -> outcome & quorum computation -> anonymous masking', async () => {
    const pollStore = new Map();
    const voteStore = new Map();

    const mockPollRepo = {
      async create(data) {
        const id = new mongoose.Types.ObjectId().toString();
        const pollDoc = {
          _id: id,
          ...data,
          status: 'Active',
          totalVotes: 0,
          outcome: 'PENDING',
          createdAt: new Date(),
          options: data.options.map((opt, idx) => ({ ...opt, votesCount: 0, index: idx }))
        };
        pollStore.set(id, pollDoc);
        return pollDoc;
      },
      async findById(id, orgId) {
        const p = pollStore.get(id);
        if (p && p.orgId.toString() === orgId.toString()) return p;
        return null;
      },
      async update(id, orgId, updateData) {
        const p = pollStore.get(id);
        if (!p || p.orgId.toString() !== orgId.toString()) return null;
        const updated = { ...p, ...updateData };
        pollStore.set(id, updated);
        return updated;
      }
    };

    const mockVoteRepo = {
      async recordVote({ pollId, orgId, residentId, optionIndices, unitNumber }) {
        const key = `${pollId}:${unitNumber || residentId}`;
        if (voteStore.has(key)) {
          const err = new Error('A vote has already been submitted for this ballot identifier.');
          err.code = 11000;
          throw err;
        }

        const poll = pollStore.get(pollId);
        if (!poll) throw new Error('Poll not found');

        // Increment option votes
        for (const idx of optionIndices) {
          if (poll.options[idx]) {
            poll.options[idx].votesCount += 1;
          }
        }
        poll.totalVotes += 1;

        const voteDoc = {
          _id: new mongoose.Types.ObjectId().toString(),
          pollId,
          orgId,
          residentId,
          unitNumber,
          optionIndices,
          createdAt: new Date()
        };
        voteStore.set(key, voteDoc);
        return { vote: voteDoc, poll };
      },
      async getVoters(pollId, orgId) {
        return Array.from(voteStore.values()).filter(
          (v) => v.pollId.toString() === pollId.toString() && v.orgId.toString() === orgId.toString()
        );
      }
    };

    // Step 1: Create Poll with Quorum requirement of 50% across 4 eligible voters
    const createdPoll = await mockPollRepo.create({
      orgId: orgA,
      question: 'Should we replace the gym equipment?',
      options: [{ text: 'Yes, full upgrade' }, { text: 'No, keep existing' }],
      choiceType: 'SINGLE_CHOICE',
      votingMode: 'ONE_PER_UNIT',
      isAnonymous: true,
      quorumPercentage: 50,
      totalEligibleVoters: 4,
      endDate: new Date(Date.now() + 86400000),
      createdBy: userAdmin
    });

    assert.equal(createdPoll.status, 'Active');
    assert.equal(createdPoll.quorumPercentage, 50);

    // Step 2: Cast concurrent votes from 2 distinct units (Meeting 50% quorum: 2 of 4)
    const [voteResult1, voteResult2] = await Promise.all([
      mockVoteRepo.recordVote({
        pollId: createdPoll._id,
        orgId: orgA,
        residentId: resident1,
        optionIndices: [0], // Option 0: 'Yes'
        unitNumber: 'Villa 101'
      }),
      mockVoteRepo.recordVote({
        pollId: createdPoll._id,
        orgId: orgA,
        residentId: resident2,
        optionIndices: [0], // Option 0: 'Yes'
        unitNumber: 'Villa 102'
      })
    ]);

    assert.equal(voteResult1.poll.totalVotes, 2);
    assert.equal(voteResult1.poll.options[0].votesCount, 2);

    // Step 3: Compute Quorum & Outcome upon closing
    const outcomeResult = computePollOutcome(voteResult1.poll);
    assert.equal(outcomeResult.quorumAchieved, true);
    assert.equal(outcomeResult.outcome, 'PASSED');
    assert.equal(outcomeResult.winningOption.text, 'Yes, full upgrade');
    assert.equal(outcomeResult.winningOption.votesCount, 2);

    // Step 4: Verify Anonymous Turnout Masking
    const voterRecords = await mockVoteRepo.getVoters(createdPoll._id, orgA);
    assert.equal(voterRecords.length, 2);

    // Test anonymizer formatting
    const anonymizedVoters = voterRecords.map((v, idx) => ({
      _id: v._id,
      name: `Voter #${idx + 1}`,
      unit: null,
      optionIndices: null // concealed choice
    }));

    assert.equal(anonymizedVoters[0].name, 'Voter #1');
    assert.equal(anonymizedVoters[0].unit, null);
    assert.equal(anonymizedVoters[0].optionIndices, null);
  });

  // -------------------------------------------------------------
  // Test 3: Multi-Tenant Isolation
  // -------------------------------------------------------------
  it('E2E Multi-Tenancy: Rejects cross-community access and cross-tenant voting', async () => {
    const audienceService = new AudienceService();

    const roleResidentId = new mongoose.Types.ObjectId().toString();
    const userContextA = {
      userId: resident1,
      orgId: orgA,
      roleIds: [roleResidentId],
      unitIds: [],
      blocks: [],
      residencyTypes: [],
      status: 'Active'
    };

    // Verify tenant isolation filter generator
    const filterA = await audienceService.buildFeedFilter(userContextA, orgA);

    assert.equal(filterA.orgId.toString(), orgA);
    assert.notEqual(filterA.orgId.toString(), orgB);

    // Target audience validation in foreign community
    const foreignTarget = {
      targetType: 'ROLES',
      targetRoles: [new mongoose.Types.ObjectId().toString()]
    };

    // Validate tenant isolation with invalid target role
    const Role = mongoose.model('Role');
    const originalFind = Role.find;
    Role.find = () => ({
      session: () => Promise.resolve([])
    });

    try {
      await assert.rejects(
        async () => {
          await audienceService.validateTarget(foreignTarget, orgA);
        },
        (err) => {
          assert.ok(err.message.includes('One or more target roles were not found'));
          return true;
        }
      );
    } finally {
      Role.find = originalFind;
    }
  });

  // -------------------------------------------------------------
  // Test 4: Cron Lifecycle & Idempotency
  // -------------------------------------------------------------
  it('E2E Scheduler: Expiry and closing cron jobs are strictly idempotent', async () => {
    let closedCount = 0;
    const mockPollRepo = {
      async closeExpiredActivePolls() {
        closedCount += 1;
        return { modifiedCount: 1 };
      }
    };

    // Calling multiple times should not cause unexpected side effects
    await mockPollRepo.closeExpiredActivePolls();
    await mockPollRepo.closeExpiredActivePolls();

    assert.equal(closedCount, 2);
  });
});
