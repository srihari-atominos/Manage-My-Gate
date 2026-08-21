import * as pollService from './poll.services.js';
import { getPermissionsForUser } from '../../middlewares/rbac.middleware.js';

const checkIsCommunityAdmin = async (user) => {
  if (user.role === 'Super Admin' || user.role === 'Platform Super Admin' || user.isPlatformSuperAdmin) return true;
  const permissions = await getPermissionsForUser(user);
  return permissions.includes('notices:manage_notices') || permissions.includes('notices.manage_notices');
};

export const createPoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollData = { ...req.body, orgId, createdBy: userId, status: 'Draft', visibility: req.body.visibility || 'Everyone' };
    
    const newPoll = await pollService.createPoll(pollData);
    return res.success(newPoll, 'Poll created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPolls = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const sort = req.query.sort || 'latest';

    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);
    const isResident = req.user.role === 'Resident' || !isCommunityAdmin;
    const userContext = { isCommunityAdmin, isResident, userId };

    const data = await pollService.getAllPolls(orgId, userId, page, limit, search, sort, userContext);
    return res.success(data, 'Polls fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getPollById = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const pollId = req.params.id;
    const userId = req.user.id || req.user._id;
    
    const poll = await pollService.getPollById(pollId, orgId);
    // Populate hasVoted for single poll
    const hasVoted = await pollService.checkIfUserVoted(pollId, orgId, userId);
    const result = { ...poll.toObject(), hasVoted };
    
    return res.success(result, 'Poll fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updatePoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollId = req.params.id;
    const updateData = req.body;
    
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const updatedPoll = await pollService.updatePoll(pollId, orgId, userId, updateData, isCommunityAdmin);
    return res.success(updatedPoll, 'Poll updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deletePoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollId = req.params.id;
    
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const deletedPoll = await pollService.deletePoll(pollId, orgId, userId, isCommunityAdmin);
    return res.success(deletedPoll, 'Poll deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const publishPoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollId = req.params.id;
    
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const updatedPoll = await pollService.publishPoll(pollId, orgId, userId, isCommunityAdmin);
    return res.success(updatedPoll, 'Poll published successfully');
  } catch (error) {
    next(error);
  }
};

export const closePoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollId = req.params.id;
    
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const updatedPoll = await pollService.closePoll(pollId, orgId, userId, isCommunityAdmin);
    return res.success(updatedPoll, 'Poll closed successfully');
  } catch (error) {
    next(error);
  }
};

export const reopenPoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollId = req.params.id;
    
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const updatedPoll = await pollService.reopenPoll(pollId, orgId, userId, isCommunityAdmin);
    return res.success(updatedPoll, 'Poll reopened successfully');
  } catch (error) {
    next(error);
  }
};

export const getActivePolls = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const sort = req.query.sort || 'latest';

    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);
    const isResident = req.user.role === 'Resident' || !isCommunityAdmin;
    const userContext = { isCommunityAdmin, isResident, userId };

    const data = await pollService.getActivePolls(orgId, userId, page, limit, search, sort, userContext);
    return res.success(data, 'Active polls fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getClosedPolls = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const sort = req.query.sort || 'latest';

    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);
    const isResident = req.user.role === 'Resident' || !isCommunityAdmin;
    const userContext = { isCommunityAdmin, isResident, userId };

    const data = await pollService.getClosedPolls(orgId, userId, page, limit, search, sort, userContext);
    return res.success(data, 'Closed polls fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getMyPolls = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const sort = req.query.sort || 'latest';

    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);
    const isResident = req.user.role === 'Resident' || !isCommunityAdmin;
    const userContext = { isCommunityAdmin, isResident, userId };

    const data = await pollService.getMyPolls(orgId, userId, page, limit, search, sort, userContext);
    return res.success(data, 'My polls fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const voteOnPoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const residentId = req.user.id || req.user._id;
    const pollId = req.params.id;
    const optionIndex = req.body.optionIndex;

    const updatedPoll = await pollService.voteOnPoll(pollId, orgId, residentId, optionIndex);
    return res.success(updatedPoll, 'Vote recorded successfully');
  } catch (error) {
    next(error);
  }
};

export const getPollResults = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const pollId = req.params.id;
    
    const results = await pollService.getPollResults(pollId, orgId);
    return res.success(results, 'Poll results fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getPollVoters = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const pollId = req.params.id;
    
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);
    if (!isCommunityAdmin) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view poll voters' });
    }

    const voters = await pollService.getPollVoters(pollId, orgId);
    return res.success(voters, 'Poll voters fetched successfully');
  } catch (error) {
    next(error);
  }
};
