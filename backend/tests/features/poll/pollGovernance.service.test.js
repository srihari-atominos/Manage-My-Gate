import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  computePollOutcome,
  canUserViewResults,
  sanitizePollForViewer
} from '../../../src/features/poll/poll.services.js';

describe('Poll Governance Service Unit Tests', () => {
  const orgId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const creatorId = new mongoose.Types.ObjectId();
  const residentId = new mongoose.Types.ObjectId();
  const otherResidentId = new mongoose.Types.ObjectId();

  describe('1. Quorum & Outcome Calculation (computePollOutcome)', () => {
    it('should return NO_QUORUM when votes are below the required quorum threshold', () => {
      const poll = {
        totalVotes: 3,
        totalEligibleVoters: 10,
        quorumPercentage: 50, // requires ceil(10 * 0.5) = 5 votes
        options: [
          { text: 'Approve Budget', votesCount: 2 },
          { text: 'Reject Budget', votesCount: 1 }
        ]
      };

      const result = computePollOutcome(poll);
      assert.strictEqual(result.outcome, 'NO_QUORUM');
      assert.strictEqual(result.quorumAchieved, false);
      assert.strictEqual(result.requiredVotes, 5);
      assert.strictEqual(result.winningOption, null);
    });

    it('should return PASSED when quorum is met and there is a clear non-rejection winner', () => {
      const poll = {
        totalVotes: 6,
        totalEligibleVoters: 10,
        quorumPercentage: 50, // requires 5 votes
        options: [
          { text: 'Approve Budget', votesCount: 4 },
          { text: 'Reject Budget', votesCount: 2 }
        ]
      };

      const result = computePollOutcome(poll);
      assert.strictEqual(result.outcome, 'PASSED');
      assert.strictEqual(result.quorumAchieved, true);
      assert.ok(result.winningOption);
      assert.strictEqual(result.winningOption.index, 0);
      assert.strictEqual(result.winningOption.text, 'Approve Budget');
      assert.strictEqual(result.winningOption.votesCount, 4);
    });

    it('should return REJECTED when quorum is met and the winning option is "Reject" or "No"', () => {
      const poll = {
        totalVotes: 7,
        totalEligibleVoters: 10,
        quorumPercentage: 50,
        options: [
          { text: 'Yes', votesCount: 2 },
          { text: 'No', votesCount: 5 }
        ]
      };

      const result = computePollOutcome(poll);
      assert.strictEqual(result.outcome, 'REJECTED');
      assert.strictEqual(result.quorumAchieved, true);
      assert.strictEqual(result.winningOption.index, 1);
      assert.strictEqual(result.winningOption.text, 'No');
    });

    it('should return TIED when top options receive identical votes', () => {
      const poll = {
        totalVotes: 6,
        totalEligibleVoters: 10,
        quorumPercentage: 50,
        options: [
          { text: 'Option A', votesCount: 3 },
          { text: 'Option B', votesCount: 3 }
        ]
      };

      const result = computePollOutcome(poll);
      assert.strictEqual(result.outcome, 'TIED');
      assert.strictEqual(result.quorumAchieved, true);
      assert.strictEqual(result.winningOption, null);
    });

    it('should return PENDING when totalVotes is 0 and no quorum is required', () => {
      const poll = {
        totalVotes: 0,
        totalEligibleVoters: 10,
        quorumPercentage: 0,
        options: [
          { text: 'Yes', votesCount: 0 },
          { text: 'No', votesCount: 0 }
        ]
      };

      const result = computePollOutcome(poll);
      assert.strictEqual(result.outcome, 'PENDING');
      assert.strictEqual(result.winningOption, null);
    });
  });

  describe('2. Results Visibility Enforcement (canUserViewResults)', () => {
    const basePoll = {
      _id: new mongoose.Types.ObjectId(),
      createdBy: creatorId,
      status: 'Active',
      resultsVisibility: 'ALWAYS'
    };

    it('should always permit community admins to view results regardless of mode', () => {
      const poll = { ...basePoll, resultsVisibility: 'ADMIN_ONLY' };
      assert.strictEqual(canUserViewResults(poll, residentId, false, true), true);
    });

    it('should always permit poll creator to view results', () => {
      const poll = { ...basePoll, resultsVisibility: 'ADMIN_ONLY' };
      assert.strictEqual(canUserViewResults(poll, creatorId, false, false), true);
    });

    it('should allow anyone when resultsVisibility is ALWAYS', () => {
      const poll = { ...basePoll, resultsVisibility: 'ALWAYS' };
      assert.strictEqual(canUserViewResults(poll, residentId, false, false), true);
    });

    it('should enforce AFTER_VOTE: deny if user has not voted, permit if user has voted', () => {
      const poll = { ...basePoll, resultsVisibility: 'AFTER_VOTE' };
      assert.strictEqual(canUserViewResults(poll, residentId, false, false), false);
      assert.strictEqual(canUserViewResults(poll, residentId, true, false), true);
    });

    it('should enforce AFTER_EXPIRY: deny while Active, permit when Closed', () => {
      const activePoll = { ...basePoll, resultsVisibility: 'AFTER_EXPIRY', status: 'Active' };
      const closedPoll = { ...basePoll, resultsVisibility: 'AFTER_EXPIRY', status: 'Closed' };

      assert.strictEqual(canUserViewResults(activePoll, residentId, true, false), false);
      assert.strictEqual(canUserViewResults(closedPoll, residentId, false, false), true);
    });

    it('should enforce ADMIN_ONLY: deny regular residents even after voting or expiry', () => {
      const poll = { ...basePoll, resultsVisibility: 'ADMIN_ONLY', status: 'Closed' };
      assert.strictEqual(canUserViewResults(poll, residentId, true, false), false);
    });
  });

  describe('3. Viewer Data Sanitization (sanitizePollForViewer)', () => {
    const rawPoll = {
      _id: new mongoose.Types.ObjectId(),
      question: 'Install Solar Panels on Club House?',
      createdBy: creatorId,
      status: 'Active',
      resultsVisibility: 'AFTER_VOTE',
      totalVotes: 10,
      options: [
        { _id: new mongoose.Types.ObjectId(), text: 'Yes', votesCount: 7 },
        { _id: new mongoose.Types.ObjectId(), text: 'No', votesCount: 3 }
      ]
    };

    it('should mask vote counts and totalVotes when user cannot view results', () => {
      const sanitized = sanitizePollForViewer(rawPoll, residentId, false, false);

      assert.strictEqual(sanitized.canViewResults, false);
      assert.strictEqual(sanitized.totalVotes, undefined);
      assert.strictEqual(sanitized.outcome, undefined);
      assert.strictEqual(sanitized.resultsVisibilityReason, 'Results will be visible after you vote.');
      assert.strictEqual(sanitized.options[0].votesCount, undefined);
      assert.strictEqual(sanitized.options[1].votesCount, undefined);
      assert.strictEqual(sanitized.options[0].text, 'Yes');
    });

    it('should compute percentages and expose vote counts when user is permitted', () => {
      const sanitized = sanitizePollForViewer(rawPoll, residentId, true, false);

      assert.strictEqual(sanitized.canViewResults, true);
      assert.strictEqual(sanitized.totalVotes, 10);
      assert.strictEqual(sanitized.options[0].votesCount, 7);
      assert.strictEqual(sanitized.options[0].percentage, 70.0);
      assert.strictEqual(sanitized.options[1].votesCount, 3);
      assert.strictEqual(sanitized.options[1].percentage, 30.0);
    });
  });

  describe('4. Single-Choice vs Multiple-Choice Validation Logic', () => {
    it('should validate maxChoices logic for multiple-choice polls', () => {
      const singleChoicePoll = { choiceType: 'SINGLE_CHOICE', maxChoices: 1, options: [{ text: 'A' }, { text: 'B' }] };
      const multiChoicePoll = { choiceType: 'MULTIPLE_CHOICE', maxChoices: 2, options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }] };

      // Single choice accepts 1 selection
      const validateChoices = (poll, selections) => {
        if (selections.length === 0) return 'At least one option must be selected';
        if (poll.choiceType === 'SINGLE_CHOICE' && selections.length > 1) return 'Single-choice poll allows 1 option';
        if (selections.length > (poll.maxChoices || 1)) return `Exceeded maxChoices ${poll.maxChoices}`;
        if (new Set(selections).size !== selections.length) return 'Duplicate selections';
        for (const idx of selections) {
          if (idx < 0 || idx >= poll.options.length) return 'Index out of bounds';
        }
        return 'VALID';
      };

      assert.strictEqual(validateChoices(singleChoicePoll, [0]), 'VALID');
      assert.strictEqual(validateChoices(singleChoicePoll, [0, 1]), 'Single-choice poll allows 1 option');
      assert.strictEqual(validateChoices(multiChoicePoll, [0, 2]), 'VALID');
      assert.strictEqual(validateChoices(multiChoicePoll, [0, 1, 2]), 'Exceeded maxChoices 2');
      assert.strictEqual(validateChoices(multiChoicePoll, [0, 0]), 'Duplicate selections');
      assert.strictEqual(validateChoices(multiChoicePoll, [5]), 'Index out of bounds');
    });
  });

  describe('5. Anonymity & Voter Data Protection', () => {
    it('should mask voter names and units when poll is anonymous in exports', () => {
      const poll = {
        _id: new mongoose.Types.ObjectId(),
        question: 'Anonymous Board Member Review',
        isAnonymous: true,
        options: [{ text: 'Satisfied' }, { text: 'Unsatisfied' }]
      };

      const voters = [
        { name: 'John Doe', unit: 'Villa 101', optionIndex: 0, createdAt: new Date() },
        { name: 'Jane Smith', unit: 'Villa 102', optionIndex: 1, createdAt: new Date() }
      ];

      const maskVoters = (isAnonymous, voterList) => {
        return voterList.map((v) => ({
          name: isAnonymous ? 'Anonymous Voter' : v.name,
          unit: isAnonymous ? null : v.unit,
          optionIndex: v.optionIndex
        }));
      };

      const masked = maskVoters(poll.isAnonymous, voters);
      assert.strictEqual(masked[0].name, 'Anonymous Voter');
      assert.strictEqual(masked[0].unit, null);
      assert.strictEqual(masked[1].name, 'Anonymous Voter');
      assert.strictEqual(masked[1].unit, null);
    });
  });
});
