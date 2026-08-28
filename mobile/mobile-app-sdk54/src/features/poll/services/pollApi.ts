import apiClient from '@/src/services/apiClient';

export const pollApi = {
  createPoll: (data: any) => apiClient.post('/polls', data),
  getPolls: (params: any) => apiClient.get('/polls', { params }),
  getActivePolls: (params: any) => apiClient.get('/polls/active', { params }),
  getClosedPolls: (params: any) => apiClient.get('/polls/closed', { params }),
  getMyPolls: (params: any) => apiClient.get('/polls/my', { params }),
  getPollById: (id: string) => apiClient.get(`/polls/${id}`),
  updatePoll: (id: string, data: any) => apiClient.put(`/polls/${id}`, data),
  deletePoll: (id: string) => apiClient.delete(`/polls/${id}`),
  publishPoll: (id: string) => apiClient.post(`/polls/${id}/publish`),
  closePoll: (id: string) => apiClient.post(`/polls/${id}/close`),
  voteOnPoll: (id: string, optionIndex: number) => apiClient.post(`/polls/${id}/vote`, { optionIndex }),
  getPollResults: (id: string) => apiClient.get(`/polls/${id}/results`),
  getPollVoters: (id: string) => apiClient.get(`/polls/${id}/voters`),
};
