import apiClient from '../../../services/apiClient';

/**
 * Poll Governance API Service Layer
 * Interfaces directly with /api/v1/polls backend endpoints.
 */

// Fetch active polls for the resident's community
export const getActivePolls = async (params = {}) => {
  return await apiClient.get('/polls/active', { params });
};

// Fetch closed polls
export const getClosedPolls = async (params = {}) => {
  return await apiClient.get('/polls/closed', { params });
};

// Fetch polls created by or involving the current user
export const getMyPolls = async (params = {}) => {
  return await apiClient.get('/polls/my', { params });
};

// Fetch single poll details by ID
export const getPollById = async (id) => {
  return await apiClient.get(`/polls/${id}`);
};

// Create a new community poll
export const createPoll = async (data) => {
  return await apiClient.post('/polls', data);
};

// Update an existing poll
export const updatePoll = async (id, data) => {
  return await apiClient.put(`/polls/${id}`, data);
};

// Delete a poll
export const deletePoll = async (id) => {
  return await apiClient.delete(`/polls/${id}`);
};

// Publish a draft or scheduled poll
export const publishPoll = async (id) => {
  return await apiClient.post(`/polls/${id}/publish`);
};

// Close an active poll
export const closePoll = async (id) => {
  return await apiClient.post(`/polls/${id}/close`);
};

// Finalize poll results
export const finalizePoll = async (id) => {
  return await apiClient.post(`/polls/${id}/finalize`);
};

// Reopen a closed poll
export const reopenPoll = async (id) => {
  return await apiClient.post(`/polls/${id}/reopen`);
};

// Cast vote on a poll
export const voteOnPoll = async (id, voteData) => {
  return await apiClient.post(`/polls/${id}/vote`, voteData);
};

// Fetch poll analytics and results breakdown
export const getPollResults = async (id) => {
  return await apiClient.get(`/polls/${id}/results`);
};

// Fetch voter list (admin/author accountability, protected if anonymous)
export const getPollVoters = async (id) => {
  return await apiClient.get(`/polls/${id}/voters`);
};

// Export poll results to CSV
export const exportPollCSV = async (id) => {
  return await apiClient.get(`/polls/${id}/export/csv`);
};

// Export poll results to JSON
export const exportPollJSON = async (id) => {
  return await apiClient.get(`/polls/${id}/export/json`);
};

export default {
  getActivePolls,
  getClosedPolls,
  getMyPolls,
  getPollById,
  createPoll,
  updatePoll,
  deletePoll,
  publishPoll,
  closePoll,
  finalizePoll,
  reopenPoll,
  voteOnPoll,
  getPollResults,
  getPollVoters,
  exportPollCSV,
  exportPollJSON,
};
