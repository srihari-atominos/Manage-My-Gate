import * as pollService from './poll.services.js';
import { getPermissionsForUser } from '../../middlewares/rbac.middleware.js';

const checkIsCommunityAdmin = async (user) => {
  if (user.role === 'Super Admin' || user.role === 'Platform Super Admin' || user.isPlatformSuperAdmin) return true;
  const permissions = await getPermissionsForUser(user);
  return (
    permissions.includes('notices:manage_notices') ||
    permissions.includes('notices.manage_notices') ||
    permissions.includes('notices:manage_polls') ||
    permissions.includes('notices.manage_polls') ||
    permissions.includes('notices:polls')
  );
};

export const createPoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollData = {
      ...req.body,
      orgId,
      createdBy: userId,
      status: req.body.status || 'Draft',
      visibility: req.body.visibility || 'Everyone'
    };

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
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const poll = await pollService.getPollById(pollId, orgId, userId, isCommunityAdmin);
    const hasVoted = await pollService.checkIfUserVoted(pollId, orgId, userId);
    const userVote = await pollService.getUserVote(pollId, orgId, userId);

    const votedOptions = userVote
      ? (Array.isArray(userVote.selectedOptions) && userVote.selectedOptions.length > 0
          ? userVote.selectedOptions
          : [userVote.optionIndex])
      : [];

    const basePoll = {
      ...poll.toObject(),
      hasVoted,
      votedOptions,
      votedOptionIndex: votedOptions[0] ?? null
    };

    const sanitized = pollService.sanitizePollForViewer(basePoll, userId, hasVoted, isCommunityAdmin);
    return res.success(sanitized, 'Poll fetched successfully');
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

export const finalizePoll = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollId = req.params.id;

    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const finalizedPoll = await pollService.finalizePoll(pollId, orgId, userId, isCommunityAdmin);
    return res.success(finalizedPoll, 'Poll finalized successfully');
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

    const updatedPoll = await pollService.voteOnPoll(pollId, orgId, residentId, req.body);
    return res.success(updatedPoll, 'Vote recorded successfully');
  } catch (error) {
    next(error);
  }
};

export const getPollResults = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const pollId = req.params.id;
    const userId = req.user.id || req.user._id;
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const results = await pollService.getPollResults(pollId, orgId, userId, isCommunityAdmin);
    return res.success(results, 'Poll results fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getPollVoters = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const pollId = req.params.id;
    const userId = req.user.id || req.user._id;
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const voters = await pollService.getPollVoters(pollId, orgId, userId, isCommunityAdmin);
    return res.success(voters, 'Poll voters fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const exportPollCSV = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollId = req.params.id;
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const csvContent = await pollService.exportPollCSV(pollId, orgId, userId, isCommunityAdmin);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="poll_${pollId}_governance_report.csv"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const exportPollJSON = async (req, res, next) => {
  try {
    const orgId = req.tenant.orgId;
    const userId = req.user.id || req.user._id;
    const pollId = req.params.id;
    const isCommunityAdmin = await checkIsCommunityAdmin(req.user);

    const jsonReport = await pollService.exportPollJSON(pollId, orgId, userId, isCommunityAdmin);
    return res.success(jsonReport, 'Poll governance audit report fetched successfully');
  } catch (error) {
    next(error);
  }
};
