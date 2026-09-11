import mongoose from 'mongoose';
import * as pollRepo from './poll.repository.js';
import pollEvents from './poll.events.js';
import HttpError from '../../utils/httpError.utils.js';
import PollVote from './pollVote.model.js';
import audienceService from '../audience/audience.service.js';
import orgMembershipService from '../orgMembership/orgMembership.services.js';
import pollReactionService from '../pollReaction/pollReaction.service.js';

/**
 * Resolves a user's assigned villa / unit ID within an organization.
 */
const resolveUserUnitId = async (residentId, orgId, requestedUnitId = null) => {
  try {
    const membership = await orgMembershipService.getMembership(residentId, orgId);
    if (membership) {
      if (membership.units && membership.units.length > 0) {
        if (requestedUnitId) {
          const found = membership.units.find(
            (u) => u.villaId && u.villaId.toString() === requestedUnitId.toString()
          );
          if (found) return found.villaId;
        }
        return membership.units[0].villaId;
      }
      if (membership.villaId) {
        return membership.villaId;
      }
    }
  } catch (err) {
    // continue to fallback
  }

  try {
    const User = mongoose.model('User');
    const user = await User.findById(residentId).select('villaId');
    if (user && user.villaId) {
      return user.villaId;
    }
  } catch (err) {
    // fallback exhausted
  }

  return null;
};

/**
 * Evaluates whether a viewer is permitted to see poll vote counts and results breakdown.
 */
export const canUserViewResults = (poll, userId, hasVoted, isCommunityAdmin = false) => {
  if (isCommunityAdmin) return true;
  if (userId && poll.createdBy && poll.createdBy._id) {
    if (poll.createdBy._id.toString() === userId.toString()) return true;
  } else if (userId && poll.createdBy && poll.createdBy.toString() === userId.toString()) {
    return true;
  }

  switch (poll.resultsVisibility) {
    case 'ALWAYS':
      return true;
    case 'AFTER_VOTE':
      return !!hasVoted;
    case 'AFTER_EXPIRY':
      return poll.status === 'Closed';
    case 'ADMIN_ONLY':
      return false;
    default:
      return true;
  }
};

/**
 * Strips vote totals from options if the user is not permitted to see results yet.
 */
export const sanitizePollForViewer = (pollObj, userId, hasVoted, isCommunityAdmin = false) => {
  const allowed = canUserViewResults(pollObj, userId, hasVoted, isCommunityAdmin);
  const totalVotes = pollObj.totalVotes || 0;

  if (!allowed) {
    const sanitizedOptions = (pollObj.options || []).map((opt) => ({
      _id: opt._id,
      text: opt.text
    }));

    return {
      ...pollObj,
      options: sanitizedOptions,
      totalVotes: undefined,
      outcome: undefined,
      winningOption: undefined,
      canViewResults: false,
      resultsVisibilityReason:
        pollObj.resultsVisibility === 'AFTER_VOTE'
          ? 'Results will be visible after you vote.'
          : pollObj.resultsVisibility === 'AFTER_EXPIRY'
          ? 'Results will be visible after the poll closes.'
          : 'Results are visible to community administrators only.'
    };
  }

  const enrichedOptions = (pollObj.options || []).map((opt) => {
    const vc = opt.votesCount || 0;
    const percentage = totalVotes > 0 ? Math.round((vc / totalVotes) * 1000) / 10 : 0;
    return {
      ...opt,
      votesCount: vc,
      percentage
    };
  });

  return {
    ...pollObj,
    options: enrichedOptions,
    canViewResults: true
  };
};

/**
 * Pure calculation of quorum status and outcome for a poll.
 */
export const computePollOutcome = (poll) => {
  const quorumPercentage = poll.quorumPercentage || 0;
  const totalEligible = poll.totalEligibleVoters || 0;
  const totalVotes = poll.totalVotes || 0;
  const requiredVotes = quorumPercentage > 0 ? Math.ceil((totalEligible * quorumPercentage) / 100) : 0;
  const quorumAchieved = quorumPercentage === 0 || totalVotes >= requiredVotes;

  if (quorumPercentage > 0 && !quorumAchieved) {
    return {
      outcome: 'NO_QUORUM',
      winningOption: null,
      quorumAchieved: false,
      requiredVotes
    };
  }

  if (totalVotes === 0) {
    return {
      outcome: 'PENDING',
      winningOption: null,
      quorumAchieved,
      requiredVotes
    };
  }

  const options = poll.options || [];
  let maxVotes = -1;
  options.forEach((opt) => {
    const vc = opt.votesCount || 0;
    if (vc > maxVotes) maxVotes = vc;
  });

  const topOptions = options
    .map((opt, idx) => ({ index: idx, text: opt.text, votesCount: opt.votesCount || 0 }))
    .filter((opt) => opt.votesCount === maxVotes);

  if (topOptions.length > 1) {
    return {
      outcome: 'TIED',
      winningOption: null,
      quorumAchieved,
      requiredVotes
    };
  }

  const winner = topOptions[0];
  const isRejected = /^(reject|rejected|against|no)$/i.test(winner.text.trim());

  return {
    outcome: isRejected ? 'REJECTED' : 'PASSED',
    winningOption: winner,
    quorumAchieved,
    requiredVotes
  };
};

export const createPoll = async (pollData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const options = (pollData.options || []).map((opt) => ({
      text: typeof opt === 'string' ? opt.trim() : (opt.text || '').trim(),
      votesCount: 0
    }));

    const data = {
      ...pollData,
      options,
      totalVotes: 0,
      status: pollData.status || 'Active',
      choiceType: pollData.choiceType || 'SINGLE_CHOICE',
      maxChoices: pollData.choiceType === 'MULTIPLE_CHOICE' ? (pollData.maxChoices || 2) : 1,
      votingMode: pollData.votingMode || 'ONE_PER_USER',
      resultsVisibility: pollData.resultsVisibility || 'ALWAYS',
      isAnonymous: !!pollData.isAnonymous,
      quorumPercentage: typeof pollData.quorumPercentage === 'number' ? pollData.quorumPercentage : 0,
      outcome: 'PENDING'
    };

    // Audience validation
    if (pollData.targetAudience) {
      data.targetAudience = await audienceService.validateTarget(pollData.targetAudience, pollData.orgId, session);
    } else {
      data.targetAudience = { targetType: 'ALL' };
    }

    // Baseline calculation of eligible voters
    data.totalEligibleVoters = await audienceService.countEligibleRecipients(
      data.targetAudience,
      pollData.orgId,
      session
    );

    const newPoll = await pollRepo.createPoll(data, session);
    await session.commitTransaction();

    const populatedPoll = await pollRepo.getPopulatedPollById(newPoll._id, pollData.orgId);
    const finalPoll = populatedPoll || newPoll;

    if (finalPoll.status === 'Active') {
      pollEvents.emit('poll_published', finalPoll);
    } else {
      pollEvents.emit('poll_created', finalPoll);
    }

    return finalPoll;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getPollById = async (pollId, orgId, userId = null, isCommunityAdmin = false) => {
  const poll = await pollRepo.getPollById(pollId, orgId);
  if (!poll) {
    throw new HttpError(404, 'Poll not found');
  }

  // Audience eligibility verification
  if (userId && !isCommunityAdmin && poll.targetAudience) {
    const isEligible = await audienceService.checkEligibility(userId, poll.targetAudience, orgId);
    if (!isEligible) {
      throw new HttpError(403, 'Access denied: You are not eligible to view this poll');
    }
  }

  const allVotes = await PollVote.find({ pollId, orgId }).lean();
  const totalVotes = allVotes.length;
  const optionVoteCounts = {};
  allVotes.forEach((v) => {
    const opts = Array.isArray(v.selectedOptions) && v.selectedOptions.length > 0
      ? v.selectedOptions
      : (typeof v.optionIndex === 'number' ? [v.optionIndex] : []);
    opts.forEach((optIdx) => {
      optionVoteCounts[optIdx] = (optionVoteCounts[optIdx] || 0) + 1;
    });
  });

  const rawPoll = poll.toObject ? poll.toObject() : poll;
  rawPoll.totalVotes = totalVotes;
  rawPoll.options = (rawPoll.options || []).map((opt, idx) => ({
    ...opt,
    votesCount: optionVoteCounts[idx] || 0
  }));

  return rawPoll;
};

export const updatePoll = async (pollId, orgId, userId, updateData, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (poll.status !== 'Draft') {
    throw new HttpError(400, 'Only Draft polls can be edited');
  }

  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to edit this poll');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const dataToUpdate = { ...updateData };

    if (updateData.choiceType) {
      dataToUpdate.choiceType = updateData.choiceType;
      dataToUpdate.maxChoices = updateData.choiceType === 'MULTIPLE_CHOICE'
        ? (updateData.maxChoices || poll.maxChoices || 2)
        : 1;
    }

    if (updateData.targetAudience) {
      dataToUpdate.targetAudience = await audienceService.validateTarget(updateData.targetAudience, orgId, session);
      dataToUpdate.totalEligibleVoters = await audienceService.countEligibleRecipients(
        dataToUpdate.targetAudience,
        orgId,
        session
      );
    }

    const updatedPoll = await pollRepo.updatePoll(pollId, orgId, dataToUpdate, session);
    await session.commitTransaction();

    pollEvents.emit('poll_updated', updatedPoll);
    return updatedPoll;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const deletePoll = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to delete this poll');
  }

  const deletedPoll = await pollRepo.deletePoll(pollId, orgId);
  pollEvents.emit('poll_deleted', { _id: pollId, orgId, actorId: userId });
  return deletedPoll;
};

export const publishPoll = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (poll.status !== 'Draft') {
    throw new HttpError(400, 'Only Draft polls can be published');
  }

  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to publish this poll');
  }

  let totalEligibleVoters = poll.totalEligibleVoters;
  try {
    totalEligibleVoters = await audienceService.countEligibleRecipients(poll.targetAudience, orgId);
  } catch (err) {
    // keep existing baseline
  }

  const updatedPoll = await pollRepo.updatePoll(pollId, orgId, {
    status: 'Active',
    totalEligibleVoters: totalEligibleVoters || 0
  });

  pollEvents.emit('poll_published', updatedPoll);
  return updatedPoll;
};

export const closePoll = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (poll.status !== 'Active') {
    throw new HttpError(400, 'Only Active polls can be closed');
  }

  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to close this poll');
  }

  const { outcome, winningOption } = computePollOutcome(poll);

  const updatedPoll = await pollRepo.updatePoll(pollId, orgId, {
    status: 'Closed',
    closedAt: new Date(),
    outcome,
    winningOption
  });

  pollEvents.emit('poll_closed', updatedPoll);
  return updatedPoll;
};

export const finalizePoll = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (!isCommunityAdmin && poll.createdBy.toString() !== userId.toString()) {
    throw new HttpError(403, 'You do not have permission to finalize this poll');
  }

  if (poll.status !== 'Closed') {
    throw new HttpError(400, 'Only closed polls can be finalized');
  }

  if (poll.finalizedAt) {
    throw new HttpError(400, 'This poll has already been finalized');
  }

  const { outcome, winningOption } = computePollOutcome(poll);

  const updatedPoll = await pollRepo.updatePoll(pollId, orgId, {
    outcome,
    winningOption,
    finalizedAt: new Date(),
    finalizedBy: userId
  });

  pollEvents.emit('poll_finalized', updatedPoll);
  return updatedPoll;
};

export const reopenPoll = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (poll.status !== 'Closed') {
    throw new HttpError(400, 'Only Closed polls can be reopened');
  }

  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to reopen this poll');
  }

  const updatedPoll = await pollRepo.updatePoll(pollId, orgId, {
    status: 'Active',
    closedAt: null,
    outcome: 'PENDING',
    finalizedAt: null,
    finalizedBy: null
  });

  pollEvents.emit('poll_reopened', updatedPoll);
  return updatedPoll;
};

const populateHasVoted = async (data, orgId, userId, isCommunityAdmin = false) => {
  if (!data || !data.polls || data.polls.length === 0) return data;

  const pollIds = data.polls.map((p) => p._id);
  const voteMap = {};

  if (userId) {
    const votes = await PollVote.find({
      pollId: { $in: pollIds },
      orgId,
      residentId: userId
    }).lean();

    votes.forEach((v) => {
      const selected = Array.isArray(v.selectedOptions) && v.selectedOptions.length > 0
        ? v.selectedOptions
        : (typeof v.optionIndex === 'number' ? [v.optionIndex] : []);
      voteMap[v.pollId.toString()] = selected;
    });
  }

  // Count actual verified votes from PollVote (1 vote per user)
  const allVotes = await PollVote.find({
    pollId: { $in: pollIds },
    orgId
  }).lean();

  const pollVoteCounts = {};
  const optionVoteCounts = {};

  allVotes.forEach((v) => {
    const pId = v.pollId.toString();
    pollVoteCounts[pId] = (pollVoteCounts[pId] || 0) + 1;

    const opts = Array.isArray(v.selectedOptions) && v.selectedOptions.length > 0
      ? v.selectedOptions
      : (typeof v.optionIndex === 'number' ? [v.optionIndex] : []);

    if (!optionVoteCounts[pId]) optionVoteCounts[pId] = {};
    opts.forEach((optIdx) => {
      optionVoteCounts[pId][optIdx] = (optionVoteCounts[pId][optIdx] || 0) + 1;
    });
  });

  data.polls = data.polls.map((poll) => {
    const pIdStr = poll._id.toString();
    const hasVoted = voteMap[pIdStr] !== undefined;
    const votedOptions = hasVoted ? voteMap[pIdStr] : [];
    const votedOptionIndex = votedOptions.length > 0 ? votedOptions[0] : null;

    const actualTotalVotes = pollVoteCounts[pIdStr] || 0;
    const reconciledOptions = (poll.options || []).map((opt, idx) => ({
      ...opt,
      votesCount: (optionVoteCounts[pIdStr] && optionVoteCounts[pIdStr][idx]) || 0
    }));

    const basePoll = {
      ...poll,
      totalVotes: actualTotalVotes,
      options: reconciledOptions,
      hasVoted,
      votedOptions,
      votedOptionIndex
    };

    return sanitizePollForViewer(basePoll, userId, hasVoted, isCommunityAdmin);
  });

  try {
    data.polls = await pollReactionService.enrichPollsWithReactions(data.polls, orgId, userId);
  } catch (err) {
    // Graceful fallback if reactions lookup encounters an error
  }

  return data;
};

export const getActivePolls = async (orgId, userId, page, limit, search, sort, userContext = null) => {
  let audienceOr = null;
  if (userId && orgId) {
    const audienceFilter = await audienceService.buildFeedFilter(userId, orgId, 'targetAudience');
    if (audienceFilter.$or && audienceFilter.$or.length > 0) {
      audienceOr = audienceFilter.$or;
    }
  }

  const data = await pollRepo.getPollsByStatus(orgId, 'Active', page, limit, search, sort, userContext, audienceOr);
  return await populateHasVoted(data, orgId, userId, userContext?.isCommunityAdmin);
};

export const getClosedPolls = async (orgId, userId, page, limit, search, sort, userContext = null) => {
  let audienceOr = null;
  if (userId && orgId) {
    const audienceFilter = await audienceService.buildFeedFilter(userId, orgId, 'targetAudience');
    if (audienceFilter.$or && audienceFilter.$or.length > 0) {
      audienceOr = audienceFilter.$or;
    }
  }

  const data = await pollRepo.getPollsByStatus(orgId, 'Closed', page, limit, search, sort, userContext, audienceOr);
  return await populateHasVoted(data, orgId, userId, userContext?.isCommunityAdmin);
};

export const getMyPolls = async (orgId, userId, page, limit, search, sort, userContext = null) => {
  let audienceOr = null;
  if (userId && orgId) {
    const audienceFilter = await audienceService.buildFeedFilter(userId, orgId, 'targetAudience');
    if (audienceFilter.$or && audienceFilter.$or.length > 0) {
      audienceOr = audienceFilter.$or;
    }
  }

  const data = await pollRepo.getMyPolls(orgId, userId, page, limit, search, sort, userContext, audienceOr);
  return await populateHasVoted(data, orgId, userId, userContext?.isCommunityAdmin);
};

export const getAllPolls = async (orgId, userId, page, limit, search, sort, userContext = null) => {
  let audienceOr = null;
  if (userId && orgId) {
    const audienceFilter = await audienceService.buildFeedFilter(userId, orgId, 'targetAudience');
    if (audienceFilter.$or && audienceFilter.$or.length > 0) {
      audienceOr = audienceFilter.$or;
    }
  }

  const data = await pollRepo.getAllPolls(orgId, page, limit, search, sort, userContext, audienceOr);
  return await populateHasVoted(data, orgId, userId, userContext?.isCommunityAdmin);
};

export const voteOnPoll = async (pollId, orgId, residentId, payload) => {
  const poll = await pollRepo.getPollById(pollId, orgId);
  if (!poll) {
    throw new HttpError(404, 'Poll not found');
  }

  if (poll.status !== 'Active') {
    throw new HttpError(400, 'Voting is only allowed on active polls');
  }

  if (poll.endDate && new Date(poll.endDate) < new Date()) {
    throw new HttpError(400, 'This poll has passed its deadline and is closed for voting.');
  }

  // Audience eligibility verification
  const isEligible = await audienceService.checkEligibility(residentId, poll.targetAudience, orgId);
  if (!isEligible) {
    throw new HttpError(403, 'Access denied: You are not eligible to vote on this poll');
  }

  // Normalize selectedOptions from payload
  let selected = [];
  if (Array.isArray(payload?.selectedOptions) && payload.selectedOptions.length > 0) {
    selected = payload.selectedOptions.map(Number);
  } else if (Array.isArray(payload?.selectedOptionIndices) && payload.selectedOptionIndices.length > 0) {
    selected = payload.selectedOptionIndices.map(Number);
  } else if (Array.isArray(payload?.optionIndices) && payload.optionIndices.length > 0) {
    selected = payload.optionIndices.map(Number);
  } else if (typeof payload?.optionIndex === 'number') {
    selected = [Number(payload.optionIndex)];
  } else if (typeof payload?.selectedOptionIndex === 'number') {
    selected = [Number(payload.selectedOptionIndex)];
  } else if (typeof payload === 'number') {
    selected = [Number(payload)];
  }

  if (selected.length === 0) {
    throw new HttpError(400, 'At least one option must be selected.');
  }

  if (poll.choiceType === 'SINGLE_CHOICE' && selected.length > 1) {
    throw new HttpError(400, 'This is a single-choice poll. You may only select 1 option.');
  }

  const maxChoices = poll.maxChoices || 1;
  if (selected.length > maxChoices) {
    throw new HttpError(400, `You can select at most ${maxChoices} options on this poll.`);
  }

  for (const idx of selected) {
    if (idx < 0 || idx >= poll.options.length) {
      throw new HttpError(400, `Invalid option index: ${idx}`);
    }
  }

  if (new Set(selected).size !== selected.length) {
    throw new HttpError(400, 'Duplicate option selections are not allowed.');
  }

  // If ONE_PER_UNIT, resolve user unit
  let unitId = null;
  if (poll.votingMode === 'ONE_PER_UNIT') {
    unitId = await resolveUserUnitId(residentId, orgId, payload?.unitId);
    if (!unitId) {
      throw new HttpError(400, 'A registered residential unit is required to participate in this unit-governed poll.');
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { poll: updatedPoll, action } = await pollRepo.recordVote(
      pollId,
      orgId,
      residentId,
      selected,
      unitId,
      poll.votingMode,
      session
    );
    await session.commitTransaction();

    if (action === 'unvoted') {
      pollEvents.emit('poll_vote_removed', {
        pollId: updatedPoll._id,
        orgId,
        residentId,
        selectedOptions: selected,
        optionIndex: selected[0],
        updatedPoll
      });
      return {
        ...updatedPoll.toObject(),
        hasVoted: false,
        votedOptions: [],
        votedOptionIndex: null
      };
    }

    pollEvents.emit('poll_vote_added', {
      pollId: updatedPoll._id,
      orgId,
      residentId,
      selectedOptions: selected,
      optionIndex: selected[0],
      updatedPoll
    });

    return {
      ...updatedPoll.toObject(),
      hasVoted: true,
      votedOptions: selected,
      votedOptionIndex: selected[0]
    };
  } catch (error) {
    await session.abortTransaction();
    if (error.code === 11000) {
      throw new HttpError(409, 'You have already voted on this poll');
    }
    throw error;
  } finally {
    session.endSession();
  }
};

export const checkIfUserVoted = async (pollId, orgId, userId) => {
  if (!userId) return false;
  return await pollRepo.hasVoted(pollId, orgId, userId);
};

export const getUserVote = async (pollId, orgId, userId) => {
  if (!userId) return null;
  return await pollRepo.getUserVote(pollId, orgId, userId);
};

export const getPollResults = async (pollId, orgId, userId = null, isCommunityAdmin = false) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  let hasVoted = false;
  if (userId) {
    hasVoted = await pollRepo.hasVoted(pollId, orgId, userId);
  }

  const allowed = canUserViewResults(poll, userId, hasVoted, isCommunityAdmin);
  if (!allowed) {
    throw new HttpError(
      403,
      poll.resultsVisibility === 'AFTER_VOTE'
        ? 'Poll results are only visible after you cast your vote.'
        : poll.resultsVisibility === 'AFTER_EXPIRY'
        ? 'Poll results will be published after the poll closes.'
        : 'Poll results are restricted to community administrators.'
    );
  }

  const totalVotes = poll.totalVotes || 0;
  const totalEligible = poll.totalEligibleVoters || 0;
  const quorumPercentage = poll.quorumPercentage || 0;
  const requiredVotes = quorumPercentage > 0 ? Math.ceil((totalEligible * quorumPercentage) / 100) : 0;
  const quorumAchieved = quorumPercentage === 0 || totalVotes >= requiredVotes;
  const participationRate = totalEligible > 0 ? Math.round((totalVotes / totalEligible) * 1000) / 10 : 0;

  const optionsBreakdown = (poll.options || []).map((opt, idx) => {
    const count = opt.votesCount || 0;
    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0;
    return {
      index: idx,
      text: opt.text,
      votesCount: count,
      percentage
    };
  });

  return {
    pollId: poll._id,
    question: poll.question,
    status: poll.status,
    choiceType: poll.choiceType,
    votingMode: poll.votingMode,
    isAnonymous: poll.isAnonymous,
    totalVotes,
    totalEligibleVoters: totalEligible,
    participationRate,
    quorumPercentage,
    requiredQuorumVotes: requiredVotes,
    quorumAchieved,
    outcome: poll.outcome,
    winningOption: poll.winningOption,
    options: optionsBreakdown,
    closedAt: poll.closedAt,
    finalizedAt: poll.finalizedAt
  };
};

export const getPollVoters = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (!isCommunityAdmin && poll.createdBy.toString() !== userId.toString()) {
    throw new HttpError(403, 'You do not have permission to view poll voters');
  }

  if (poll.isAnonymous) {
    return {
      isAnonymous: true,
      totalVotes: poll.totalVotes || 0,
      message: 'This is an anonymous poll. Individual voter identities are protected.',
      summary: (poll.options || []).map((opt, idx) => ({
        optionIndex: idx,
        optionText: opt.text,
        votesCount: opt.votesCount || 0
      }))
    };
  }

  const voters = await pollRepo.getPollVoters(pollId, orgId, false);

  const groupedVoters = {};
  poll.options.forEach((opt, idx) => {
    groupedVoters[idx] = [];
  });

  voters.forEach((voter) => {
    if (groupedVoters[voter.optionIndex]) {
      groupedVoters[voter.optionIndex].push({
        name: voter.name,
        unit: voter.unit,
        votedAt: voter.createdAt
      });
    }
  });

  return groupedVoters;
};

export const exportPollCSV = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (!isCommunityAdmin && poll.createdBy.toString() !== userId.toString()) {
    throw new HttpError(403, 'Only administrators or the poll creator can export poll data');
  }

  const voters = await pollRepo.getPollVoters(pollId, orgId, poll.isAnonymous);
  const escapeCSV = (arr) => arr.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',');

  const lines = [
    escapeCSV(['COMMUNITY POLL GOVERNANCE REPORT']),
    escapeCSV(['Poll ID', poll._id.toString()]),
    escapeCSV(['Question', poll.question]),
    escapeCSV(['Description', poll.description || '']),
    escapeCSV(['Status', poll.status]),
    escapeCSV(['Choice Type', poll.choiceType]),
    escapeCSV(['Voting Mode', poll.votingMode]),
    escapeCSV(['Results Visibility', poll.resultsVisibility]),
    escapeCSV(['Anonymous Voting', poll.isAnonymous ? 'Yes' : 'No']),
    escapeCSV(['Quorum Requirement', `${poll.quorumPercentage}%`]),
    escapeCSV(['Total Eligible Voters', poll.totalEligibleVoters]),
    escapeCSV(['Total Votes Cast', poll.totalVotes]),
    escapeCSV(['Outcome', poll.outcome]),
    escapeCSV(['Winning Option', poll.winningOption ? poll.winningOption.text : 'N/A']),
    escapeCSV(['Created At', poll.createdAt ? poll.createdAt.toISOString() : '']),
    escapeCSV(['Closed At', poll.closedAt ? poll.closedAt.toISOString() : '']),
    escapeCSV(['Finalized At', poll.finalizedAt ? poll.finalizedAt.toISOString() : '']),
    '',
    escapeCSV(['OPTIONS BREAKDOWN']),
    escapeCSV(['Option Index', 'Option Text', 'Votes Count', 'Percentage'])
  ];

  const totalVotes = poll.totalVotes || 0;
  (poll.options || []).forEach((opt, idx) => {
    const vc = opt.votesCount || 0;
    const pct = totalVotes > 0 ? `${(Math.round((vc / totalVotes) * 1000) / 10).toFixed(1)}%` : '0.0%';
    lines.push(escapeCSV([idx, opt.text, vc, pct]));
  });

  lines.push('');
  lines.push(escapeCSV(['VOTER PARTICIPATION AUDIT']));
  lines.push(escapeCSV(['Voter Name', 'Unit', 'Selected Option', 'Voted At']));

  voters.forEach((v) => {
    const selectedOptText = poll.options[v.optionIndex]?.text || `Option ${v.optionIndex}`;
    lines.push(
      escapeCSV([
        v.name,
        v.unit || 'N/A',
        selectedOptText,
        v.createdAt ? new Date(v.createdAt).toISOString() : 'N/A'
      ])
    );
  });

  return lines.join('\n');
};

export const exportPollJSON = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId, userId, isCommunityAdmin);

  if (!isCommunityAdmin && poll.createdBy.toString() !== userId.toString()) {
    throw new HttpError(403, 'Only administrators or the poll creator can export poll data');
  }

  const voters = await pollRepo.getPollVoters(pollId, orgId, poll.isAnonymous);
  const results = await getPollResults(pollId, orgId, userId, true);

  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      orgId
    },
    poll: results,
    voters: voters.map((v) => ({
      name: v.name,
      unit: v.unit,
      optionIndex: v.optionIndex,
      selectedOptions: v.selectedOptions,
      votedAt: v.createdAt
    }))
  };
};

/**
 * Scans and auto-closes expired active polls.
 * Atomically computes quorum outcome and emits poll_closed.
 */
export const processExpiredPolls = async (now = new Date()) => {
  const Poll = mongoose.model('Poll');
  const expiredPolls = await Poll.find({
    status: 'Active',
    endDate: { $lte: now }
  });

  const closedPolls = [];
  for (const poll of expiredPolls) {
    try {
      const { outcome, winningOption } = computePollOutcome(poll);

      const updatedPoll = await Poll.findOneAndUpdate(
        { _id: poll._id, status: 'Active', endDate: { $lte: now } },
        {
          $set: {
            status: 'Closed',
            closedAt: now,
            outcome,
            winningOption
          }
        },
        { new: true }
      );

      if (updatedPoll) {
        pollEvents.emit('poll_closed', updatedPoll);
        closedPolls.push(updatedPoll);
      }
    } catch (pollError) {
      // Continue processing other expired polls
    }
  }

  return {
    closedCount: closedPolls.length,
    polls: closedPolls
  };
};

/**
 * Scans active polls ending in approximately 24 hours and emits poll_closing_soon.
 */
export const processClosingSoonPolls = async (now = new Date()) => {
  const Poll = mongoose.model('Poll');
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowStart = new Date(twentyFourHoursFromNow.getTime() - 5 * 60 * 1000);
  const windowEnd = new Date(twentyFourHoursFromNow.getTime() + 5 * 60 * 1000);

  const closingSoonPolls = await Poll.find({
    status: 'Active',
    endDate: { $gte: windowStart, $lte: windowEnd }
  });

  for (const poll of closingSoonPolls) {
    pollEvents.emit('poll_closing_soon', poll);
  }

  return {
    alertedCount: closingSoonPolls.length,
    polls: closingSoonPolls
  };
};

