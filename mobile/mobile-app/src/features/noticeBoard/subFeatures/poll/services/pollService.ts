import apiClient from '@/src/services/apiClient';

export interface PollOption {
  _id: string;
  text: string;
  votesCount: number;
}

export interface Poll {
  _id: string;
  orgId: string;
  question: string;
  description?: string;
  options: PollOption[];
  status: 'Draft' | 'Active' | 'Closed';
  endDate: string;
  createdBy: any;
  visibility: 'Everyone' | 'Community Admin Only' | 'Residents Only';
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  hasVoted?: boolean;
  votedOptionIndex?: number | null;
}

export const pollService = {
  createPoll: async (pollData: any): Promise<Poll> => {
    const response = await apiClient.post('/polls', pollData);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  getActivePolls: async (params?: any): Promise<{ polls: Poll[]; totalCount: number }> => {
    const response = await apiClient.get('/polls/active', { params });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  getClosedPolls: async (params?: any): Promise<{ polls: Poll[]; totalCount: number }> => {
    const response = await apiClient.get('/polls/closed', { params });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  getMyPolls: async (params?: any): Promise<{ polls: Poll[]; totalCount: number }> => {
    const response = await apiClient.get('/polls/my', { params });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  getPollById: async (id: string): Promise<Poll & { hasVoted?: boolean }> => {
    const response = await apiClient.get(`/polls/${id}`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  updatePoll: async (id: string, pollData: any): Promise<Poll> => {
    const response = await apiClient.put(`/polls/${id}`, pollData);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  deletePoll: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/polls/${id}`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  publishPoll: async (id: string): Promise<Poll> => {
    const response = await apiClient.post(`/polls/${id}/publish`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  closePoll: async (id: string): Promise<Poll> => {
    const response = await apiClient.post(`/polls/${id}/close`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  voteOnPoll: async (id: string, optionIndex: number): Promise<Poll> => {
    const response = await apiClient.post(`/polls/${id}/vote`, { optionIndex });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  getPollVoters: async (id: string): Promise<Record<number, any[]>> => {
    const response = await apiClient.get(`/polls/${id}/voters`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },
};

export default pollService;
