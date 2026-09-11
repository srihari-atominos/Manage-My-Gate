import apiClient from '@/src/services/apiClient';
import storage from '@/src/utils/storage';
import {
  PulseItem,
  CommunityMoodOption,
  MoodResult,
  DailyQuestion,
  CommunityInterest,
  PulseCategory,
} from '../types/communityPulseTypes';

const MOCK_PULSES_KEY = 'community_pulse_mock_list';
const MOCK_MOOD_KEY = 'community_pulse_mood';
const MOCK_QUESTION_KEY = 'community_pulse_question';
const MOCK_INTERESTS_KEY = 'community_pulse_user_interests';

export const MASTER_INTERESTS: CommunityInterest[] = [
  { id: 'badminton', name: 'Badminton', emoji: '🏸' },
  { id: 'coffee', name: 'Coffee & Chat', emoji: '☕' },
  { id: 'walking', name: 'Walking / Jogging', emoji: '🚶' },
  { id: 'gardening', name: 'Gardening', emoji: '🌱' },
  { id: 'music', name: 'Music', emoji: '🎵' },
  { id: 'reading', name: 'Book Club', emoji: '📚' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
  { id: 'pets', name: 'Pet Care', emoji: '🐶' },
  { id: 'cooking', name: 'Cooking & Recipes', emoji: '🍳' },
  { id: 'fitness', name: 'Gym & Fitness', emoji: '🏋️' },
  { id: 'photography', name: 'Photography', emoji: '📸' },
  { id: 'swimming', name: 'Swimming', emoji: '🏊' },
];

const DEFAULT_INITIAL_PULSES: PulseItem[] = [];

const DEFAULT_QUESTION: DailyQuestion = {
  id: 'dq_101',
  question: '☕ Morning Coffee or 🍵 Evening Tea?',
  totalVotes: 0,
  userAnswerId: undefined,
  options: [
    { id: 'opt_coffee', label: 'Coffee ☕', percentage: 0, count: 0 },
    { id: 'opt_tea', label: 'Tea 🍵', percentage: 0, count: 0 },
  ],
};

const DEFAULT_MOOD_RESULTS: MoodResult[] = [
  { option: 'great', label: 'Great', emoji: '😊', percentage: 0, count: 0 },
  { option: 'relaxed', label: 'Relaxed', emoji: '😌', percentage: 0, count: 0 },
  { option: 'energetic', label: 'Energetic', emoji: '🔥', percentage: 0, count: 0 },
  { option: 'quiet', label: 'Quiet', emoji: '🌧️', percentage: 0, count: 0 },
  { option: 'excited', label: 'Excited', emoji: '🎉', percentage: 0, count: 0 },
];

export const communityPulseService = {
  fetchActivePulses: async (): Promise<PulseItem[]> => {
    try {
      const response = await apiClient.get('/community/pulses');
      if (response && (response as any).data) {
        return (response as any).data;
      }
    } catch (err) {
      // Fallback to local storage cache
    }

    try {
      const cached = await storage.getItem(MOCK_PULSES_KEY);
      if (cached) {
        const parsed: PulseItem[] = JSON.parse(cached);
        const now = new Date().getTime();
        // Filter out expired items (>24h)
        const valid = parsed.filter((item) => new Date(item.expiresAt).getTime() > now);
        return valid;
      }
    } catch (e) {}

    return [];
  },

  createPulse: async (payload: {
    text: string;
    contextText?: string;
    emoji?: string;
    category?: PulseCategory;
    userName?: string;
    userVilla?: string;
  }): Promise<PulseItem> => {
    const newPulse: PulseItem = {
      id: `p_${Date.now()}`,
      userId: 'u_current',
      userName: payload.userName || 'Resident',
      userVilla: payload.userVilla || '',
      text: payload.text,
      contextText: payload.contextText || undefined,
      emoji: payload.emoji || '💬',
      category: payload.category || 'general',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      await apiClient.post('/community/pulses', newPulse);
    } catch (err) {
      // Endpoint fallback
    }

    const existing = await communityPulseService.fetchActivePulses();
    const updated = [newPulse, ...existing];
    await storage.setItem(MOCK_PULSES_KEY, JSON.stringify(updated));
    return newPulse;
  },

  removePulse: async (pulseId: string): Promise<void> => {
    try {
      await apiClient.delete(`/community/pulses/${pulseId}`);
    } catch (err) {}

    const existing = await communityPulseService.fetchActivePulses();
    const updated = existing.filter((p) => p.id !== pulseId);
    await storage.setItem(MOCK_PULSES_KEY, JSON.stringify(updated));
  },

  fetchDailyQuestion: async (): Promise<DailyQuestion> => {
    try {
      const response = await apiClient.get('/community/daily-question');
      if (response && (response as any).data) {
        return (response as any).data;
      }
    } catch (e) {}

    try {
      const cached = await storage.getItem(MOCK_QUESTION_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    return DEFAULT_QUESTION;
  },

  voteDailyQuestion: async (optionId: string): Promise<DailyQuestion> => {
    const question = await communityPulseService.fetchDailyQuestion();
    if (question.userAnswerId) return question; // Prevent duplicate vote

    const updatedOptions = question.options.map((opt) => {
      if (opt.id === optionId) {
        const nextCount = opt.count + 1;
        return { ...opt, count: nextCount };
      }
      return opt;
    });

    const newTotal = question.totalVotes + 1;
    const recalculated = updatedOptions.map((opt) => ({
      ...opt,
      percentage: Math.round((opt.count / newTotal) * 100),
    }));

    const result: DailyQuestion = {
      ...question,
      totalVotes: newTotal,
      userAnswerId: optionId,
      options: recalculated,
    };

    try {
      await apiClient.post('/community/daily-question/vote', { optionId });
    } catch (e) {}

    await storage.setItem(MOCK_QUESTION_KEY, JSON.stringify(result));
    return result;
  },

  fetchCommunityMood: async (): Promise<{ userVote: CommunityMoodOption | null; totalResponses: number; results: MoodResult[] }> => {
    try {
      const cached = await storage.getItem(MOCK_MOOD_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    return {
      userVote: null,
      totalResponses: 0,
      results: DEFAULT_MOOD_RESULTS,
    };
  },

  voteCommunityMood: async (option: CommunityMoodOption): Promise<{ userVote: CommunityMoodOption; totalResponses: number; results: MoodResult[] }> => {
    const moodState = await communityPulseService.fetchCommunityMood();
    const newTotal = moodState.totalResponses + 1;

    const updatedResults = moodState.results.map((item) => {
      const count = item.option === option ? item.count + 1 : item.count;
      return {
        ...item,
        count,
        percentage: Math.round((count / newTotal) * 100),
      };
    });

    const result = {
      userVote: option,
      totalResponses: newTotal,
      results: updatedResults,
    };

    try {
      await apiClient.post('/community/mood', { option });
    } catch (e) {}

    await storage.setItem(MOCK_MOOD_KEY, JSON.stringify(result));
    return result;
  },

  fetchUserInterests: async (): Promise<string[]> => {
    try {
      const cached = await storage.getItem(MOCK_INTERESTS_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  },

  saveUserInterests: async (interests: string[]): Promise<string[]> => {
    try {
      await apiClient.post('/community/interests', { interests });
    } catch (e) {}
    await storage.setItem(MOCK_INTERESTS_KEY, JSON.stringify(interests));
    return interests;
  },
};

export default communityPulseService;
