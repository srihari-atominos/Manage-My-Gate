import * as pollRepo from './poll.repository.js';
import pollEvents from './poll.events.js';
import HttpError from '../../utils/httpError.utils.js';
import PollVote from './pollVote.model.js';

export const createPoll = async (pollData) => {
  const newPoll = await pollRepo.createPoll(pollData);
  const populatedPoll = await pollRepo.getPopulatedPollById(newPoll._id, pollData.orgId);
  pollEvents.emit('poll_created', populatedPoll || newPoll);
  return populatedPoll || newPoll;
};

export const getPollById = async (pollId, orgId) => {
  const poll = await pollRepo.getPollById(pollId, orgId);
  if (!poll) {
    throw new HttpError(404, 'Poll not found');
  }
  return poll;
};

export const updatePoll = async (pollId, orgId, userId, updateData, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId);
  
  if (poll.status !== 'Draft') {
    throw new HttpError(400, 'Only Draft polls can be edited');
  }
  
  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to edit this poll');
  }

  const updatedPoll = await pollRepo.updatePoll(pollId, orgId, updateData);
  pollEvents.emit('poll_updated', updatedPoll);
  return updatedPoll;
};

export const deletePoll = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId);
  
  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to delete this poll');
  }

  const deletedPoll = await pollRepo.deletePoll(pollId, orgId);
  pollEvents.emit('poll_deleted', { _id: pollId, orgId, actorId: userId });
  return deletedPoll;
};

export const publishPoll = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId);
  
  if (poll.status !== 'Draft') {
    throw new HttpError(400, 'Only Draft polls can be published');
  }
  
  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to publish this poll');
  }

  const updatedPoll = await pollRepo.updatePoll(pollId, orgId, { status: 'Active' });
  pollEvents.emit('poll_published', updatedPoll);
  return updatedPoll;
};

export const closePoll = async (pollId, orgId, userId, isCommunityAdmin) => {
  const poll = await getPollById(pollId, orgId);
  
  if (poll.status !== 'Active') {
    throw new HttpError(400, 'Only Active polls can be closed');
  }
  
  if (poll.createdBy.toString() !== userId.toString() && !isCommunityAdmin) {
    throw new HttpError(403, 'You do not have permission to close this poll');
  }

  const updatedPoll = await pollRepo.updatePoll(pollId, orgId, { status: 'Closed', closedAt: new Date() });
  pollEvents.emit('poll_closed', updatedPoll);
  return updatedPoll;
};

const populateHasVoted = async (data, orgId, userId) => {
  if (!data || !data.polls || data.polls.length === 0 || !userId) return data;

  const pollIds = data.polls.map(p => p._id);
  const votes = await PollVote.find({ pollId: { $in: pollIds }, orgId, residentId: userId });
  
  const voteMap = {};
  votes.forEach(v => { voteMap[v.pollId.toString()] = v.optionIndex; });
  
  data.polls = data.polls.map(poll => {
    const hasVoted = voteMap[poll._id.toString()] !== undefined;
    return {
      ...poll,
      hasVoted,
      votedOptionIndex: hasVoted ? voteMap[poll._id.toString()] : null
    };
  });
  
  return data;
};

export const getActivePolls = async (orgId, userId, page, limit, search, sort, userContext = null) => {
  const data = await pollRepo.getPollsByStatus(orgId, 'Active', page, limit, search, sort, userContext);
  return await populateHasVoted(data, orgId, userId);
};

export const getClosedPolls = async (orgId, userId, page, limit, search, sort, userContext = null) => {
  const data = await pollRepo.getPollsByStatus(orgId, 'Closed', page, limit, search, sort, userContext);
  return await populateHasVoted(data, orgId, userId);
};

export const getMyPolls = async (orgId, userId, page, limit, search, sort, userContext = null) => {
  const data = await pollRepo.getMyPolls(orgId, userId, page, limit, search, sort, userContext);
  return await populateHasVoted(data, orgId, userId);
};

export const getAllPolls = async (orgId, userId, page, limit, search, sort, userContext = null) => {
  const data = await pollRepo.getAllPolls(orgId, page, limit, search, sort, userContext);
  return await populateHasVoted(data, orgId, userId);
};

export const voteOnPoll = async (pollId, orgId, residentId, optionIndex) => {
  const poll = await getPollById(pollId, orgId);
  
  if (poll.status !== 'Active') {
    throw new HttpError(400, 'Voting is only allowed on active polls');
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    throw new HttpError(400, 'Invalid option index');
  }

  try {
    const { poll: updatedPoll, action } = await pollRepo.recordVote(pollId, orgId, residentId, optionIndex);
    
    if (action === 'unvoted') {
      pollEvents.emit('poll_vote_removed', {
        pollId: updatedPoll._id,
        orgId,
        residentId,
        optionIndex,
        updatedPoll
      });
      return { ...updatedPoll.toObject(), hasVoted: false, votedOptionIndex: null };
    }

    pollEvents.emit('poll_vote_added', {
      pollId: updatedPoll._id,
      orgId,
      residentId,
      optionIndex,
      updatedPoll
    });
    
    return { ...updatedPoll.toObject(), hasVoted: true, votedOptionIndex: optionIndex };
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error code
      throw new HttpError(409, 'You have already voted on this poll');
    }
    throw error;
  }
};

export const getPollResults = async (pollId, orgId) => {
  return await getPollById(pollId, orgId); // Result is basically the poll object with options.votesCount
};

export const getPollVoters = async (pollId, orgId) => {
  const poll = await getPollById(pollId, orgId);

  const voters = await pollRepo.getPollVoters(pollId, orgId);
  
  // Group voters by optionIndex for easier frontend consumption
  const groupedVoters = {};
  poll.options.forEach((opt, idx) => {
    groupedVoters[idx] = [];
  });
  
  voters.forEach(voter => {
    if (groupedVoters[voter.optionIndex]) {
      groupedVoters[voter.optionIndex].push({ name: voter.name, unit: voter.unit });
    }
  });
  
  return groupedVoters;
};
