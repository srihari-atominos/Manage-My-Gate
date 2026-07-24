import Poll from './poll.model.js';
import PollVote from './pollVote.model.js';
import mongoose from 'mongoose';

export const createPoll = async (pollData) => {
  return await Poll.create(pollData);
};

export const getPollById = async (pollId, orgId) => {
  return await Poll.findOne({ _id: pollId, orgId });
};

export const updatePoll = async (pollId, orgId, updateData) => {
  return await Poll.findOneAndUpdate({ _id: pollId, orgId }, updateData, { new: true, runValidators: true });
};

export const deletePoll = async (pollId, orgId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const deletedPoll = await Poll.findOneAndDelete({ _id: pollId, orgId }).session(session);
    if (deletedPoll) {
      await PollVote.deleteMany({ pollId, orgId }).session(session);
    }
    await session.commitTransaction();
    return deletedPoll;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const buildSortStage = (sortParam) => {
  switch (sortParam) {
    case 'oldest': return { createdAt: 1 };
    case 'endingSoon': return { endDate: 1 };
    case 'latest':
    default: return { createdAt: -1 };
  }
};

const buildMatchStage = (baseMatch, search, userContext) => {
  const match = { ...baseMatch };
  if (search) {
    match.question = { $regex: search, $options: 'i' };
  }
  if (userContext) {
    const { isCommunityAdmin, isResident, userId } = userContext;
    const visibilityConditions = [
      { visibility: 'Everyone' },
      { visibility: { $exists: false } }
    ];
    if (isCommunityAdmin) visibilityConditions.push({ visibility: 'Community Admin Only' });
    if (isResident) visibilityConditions.push({ visibility: 'Residents Only' });
    if (userId) visibilityConditions.push({ createdBy: new mongoose.Types.ObjectId(userId) });
    
    // Only apply if $or isn't already used, or merge it
    if (match.$or) {
      match.$and = [{ $or: match.$or }, { $or: visibilityConditions }];
      delete match.$or;
    } else {
      match.$or = visibilityConditions;
    }
  }
  return match;
};

const getPopulateCreatorStages = () => [
  {
    $lookup: {
      from: 'users',
      localField: 'createdBy',
      foreignField: '_id',
      as: 'creator_info'
    }
  },
  {
    $unwind: { path: '$creator_info', preserveNullAndEmptyArrays: true }
  },
  {
    $lookup: {
      from: 'villas',
      localField: 'creator_info.villaId',
      foreignField: '_id',
      as: 'villa_info'
    }
  },
  {
    $unwind: { path: '$villa_info', preserveNullAndEmptyArrays: true }
  },
  {
    $addFields: {
      'createdBy': {
        _id: '$createdBy',
        name: { $ifNull: ['$creator_info.name', 'Unknown'] },
        unit: { $ifNull: ['$villa_info.villaNumber', ''] }
      }
    }
  },
  {
    $project: {
      creator_info: 0,
      villa_info: 0
    }
  }
];

export const getPollsByStatus = async (orgId, status, page = 1, limit = 20, search = '', sort = 'latest', userContext = null) => {
  const skip = (page - 1) * limit;
  
  const pipeline = [
    { $match: buildMatchStage({ orgId: new mongoose.Types.ObjectId(orgId), status }, search, userContext) },
    { $sort: buildSortStage(sort) },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }, ...getPopulateCreatorStages()],
        totalCount: [{ $count: 'count' }]
      }
    }
  ];

  const result = await Poll.aggregate(pipeline);
  const data = result[0].data;
  const totalCount = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;

  return {
    polls: data,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page
  };
};

export const getMyPolls = async (orgId, userId, page = 1, limit = 20, search = '', sort = 'latest', userContext = null) => {
  const skip = (page - 1) * limit;
  
  const pipeline = [
    { $match: buildMatchStage({ orgId: new mongoose.Types.ObjectId(orgId), createdBy: new mongoose.Types.ObjectId(userId) }, search, userContext) },
    { $sort: buildSortStage(sort) },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }, ...getPopulateCreatorStages()],
        totalCount: [{ $count: 'count' }]
      }
    }
  ];

  const result = await Poll.aggregate(pipeline);
  const data = result[0].data;
  const totalCount = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;

  return {
    polls: data,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page
  };
};

export const getAllPolls = async (orgId, page = 1, limit = 20, search = '', sort = 'latest', userContext = null) => {
  const skip = (page - 1) * limit;
  
  const pipeline = [
    { $match: buildMatchStage({ orgId: new mongoose.Types.ObjectId(orgId) }, search, userContext) },
    { $sort: buildSortStage(sort) },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }, ...getPopulateCreatorStages()],
        totalCount: [{ $count: 'count' }]
      }
    }
  ];

  const result = await Poll.aggregate(pipeline);
  const data = result[0].data;
  const totalCount = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;

  return {
    polls: data,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page
  };
};

export const recordVote = async (pollId, orgId, residentId, optionIndex) => {
  // Check if a vote already exists
  const existingVote = await PollVote.findOne({ pollId, orgId, residentId });
  
  if (existingVote) {
    if (existingVote.optionIndex === optionIndex) {
      // Same option, do nothing
      return await Poll.findById(pollId);
    }
    
    // Decrement old option, increment new option
    const updatedPoll = await Poll.findOneAndUpdate(
      { _id: pollId, orgId },
      { 
        $inc: { 
          [`options.${existingVote.optionIndex}.votesCount`]: -1,
          [`options.${optionIndex}.votesCount`]: 1
        } 
      },
      { new: true }
    );
    
    // Update the vote record
    existingVote.optionIndex = optionIndex;
    await existingVote.save();
    
    return updatedPoll;
  }
  
  // Create the new vote
  await PollVote.create({ pollId, orgId, residentId, optionIndex });
  
  // Increment the new option
  const updatedPoll = await Poll.findOneAndUpdate(
    { _id: pollId, orgId },
    { $inc: { [`options.${optionIndex}.votesCount`]: 1 } },
    { new: true }
  );
  
  return updatedPoll;
};

export const getPollResults = async (pollId, orgId) => {
  return await Poll.findOne({ _id: pollId, orgId });
};

export const hasVoted = async (pollId, orgId, residentId) => {
  const vote = await PollVote.findOne({ pollId, orgId, residentId });
  return !!vote;
};

export const getUserVotedPollIds = async (orgId, residentId, pollIds) => {
  const votes = await PollVote.find({ orgId, residentId, pollId: { $in: pollIds } });
  return votes.map(v => v.pollId.toString());
};
