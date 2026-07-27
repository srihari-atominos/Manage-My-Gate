import apiClient from '../../../services/apiClient'

export const pollApi = {
  createPoll: (data) => apiClient.post('/polls', data),
  getPolls: (params) => apiClient.get('/polls', { params }),
  getActivePolls: (params) => apiClient.get('/polls/active', { params }),
  getClosedPolls: (params) => apiClient.get('/polls/closed', { params }),
  getMyPolls: (params) => apiClient.get('/polls/my', { params }),
  getPollById: (id) => apiClient.get(`/polls/${id}`),
  updatePoll: (id, data) => apiClient.put(`/polls/${id}`, data),
  deletePoll: (id) => apiClient.delete(`/polls/${id}`),
  publishPoll: (id) => apiClient.post(`/polls/${id}/publish`),
  closePoll: (id) => apiClient.post(`/polls/${id}/close`),
  voteOnPoll: (id, optionIndex) => apiClient.post(`/polls/${id}/vote`, { optionIndex }),
  getPollResults: (id) => apiClient.get(`/polls/${id}/results`),
  getPollVoters: (id) => apiClient.get(`/polls/${id}/voters`),
}
