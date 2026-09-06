import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/src/store/store';
import {
  fetchPulsesThunk,
  createPulseThunk,
  removePulseThunk,
  fetchDailyQuestionThunk,
  voteDailyQuestionThunk,
  fetchCommunityMoodThunk,
  voteCommunityMoodThunk,
  fetchInterestsThunk,
  saveInterestsThunk,
} from '../store/communityPulseSlice';
import { CommunityMoodOption, PulseCategory } from '../types/communityPulseTypes';
import { MASTER_INTERESTS } from '../services/communityPulseService';

export const formatRelativeTime = (isoString: string): string => {
  if (!isoString) return 'Just now';
  const created = new Date(isoString).getTime();
  const now = Date.now();
  const diffMinutes = Math.floor((now - created) / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

export const formatRemainingTime = (expiresAtIso: string): string => {
  if (!expiresAtIso) return '24h';
  const expires = new Date(expiresAtIso).getTime();
  const now = Date.now();
  const diffMs = expires - now;
  if (diffMs <= 0) return 'Expired';
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours >= 1) return `${diffHours}h`;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins}m`;
};

export const useCommunityPulse = () => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((s: RootState) => (s as any).communityPulse);

  const activePulses = state?.activePulses || [];
  const userActivePulse = state?.userActivePulse || null;
  const communityMood = state?.communityMood || { userVote: null, totalResponses: 141, results: [] };
  const dailyQuestion = state?.dailyQuestion || null;
  const userInterests = state?.userInterests || [];
  const loading = state?.loading || false;
  const error = state?.error || null;

  useEffect(() => {
    dispatch(fetchPulsesThunk());
    dispatch(fetchDailyQuestionThunk());
    dispatch(fetchCommunityMoodThunk());
    dispatch(fetchInterestsThunk());
  }, [dispatch]);

  const createPulse = useCallback(
    (text: string, emoji?: string, category?: PulseCategory, contextText?: string) => {
      return dispatch(createPulseThunk({ text, emoji, category, contextText }));
    },
    [dispatch]
  );

  const removePulse = useCallback(
    (pulseId: string) => {
      return dispatch(removePulseThunk(pulseId));
    },
    [dispatch]
  );

  const voteDailyQuestion = useCallback(
    (optionId: string) => {
      return dispatch(voteDailyQuestionThunk(optionId));
    },
    [dispatch]
  );

  const voteCommunityMood = useCallback(
    (option: CommunityMoodOption) => {
      return dispatch(voteCommunityMoodThunk(option));
    },
    [dispatch]
  );

  const saveInterests = useCallback(
    (interests: string[]) => {
      return dispatch(saveInterestsThunk(interests));
    },
    [dispatch]
  );

  return {
    activePulses,
    userActivePulse,
    communityMood,
    dailyQuestion,
    userInterests,
    masterInterests: MASTER_INTERESTS,
    loading,
    error,
    createPulse,
    removePulse,
    voteDailyQuestion,
    voteCommunityMood,
    saveInterests,
    refetchPulses: () => dispatch(fetchPulsesThunk()),
  };
};

export default useCommunityPulse;
