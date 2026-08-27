import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { AppDispatch, RootState } from '@/src/store/store';
import {
  fetchActivePolls,
  fetchClosedPolls,
  fetchMyPolls,
  createPoll,
  voteOnPoll,
  fetchPollVoters,
  pollDeletedSocket,
  pollClosedSocket,
  pollReopenedSocket,
  pollPublishedSocket,
} from '../store/pollSlice';
import { pollService } from '../services/pollService';

export const usePolls = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activePolls, closedPolls, myPolls, voters, votersLoading, votersError } = useSelector((state: RootState) => (state as any).poll);

  const loadActivePolls = useCallback(
    (params?: any) => {
      dispatch(fetchActivePolls(params));
    },
    [dispatch]
  );

  const loadClosedPolls = useCallback(
    (params?: any) => {
      dispatch(fetchClosedPolls(params));
    },
    [dispatch]
  );

  const loadMyPolls = useCallback(
    (params?: any) => {
      dispatch(fetchMyPolls(params));
    },
    [dispatch]
  );

  const loadPollVoters = useCallback(
    (pollId: string) => {
      dispatch(fetchPollVoters(pollId));
    },
    [dispatch]
  );

  const submitNewPoll = async (pollData: any) => {
    return await dispatch(createPoll(pollData)).unwrap();
  };

  const submitVote = async (pollId: string, optionIndex: number) => {
    return await dispatch(voteOnPoll({ id: pollId, optionIndex })).unwrap();
  };

  const publishPoll = async (pollId: string) => {
    const result = await pollService.publishPoll(pollId);
    if (result) {
      dispatch(pollPublishedSocket(result));
    }
    return result;
  };

  const closePoll = async (pollId: string) => {
    const result = await pollService.closePoll(pollId);
    if (result) {
      dispatch(pollClosedSocket(result));
    }
    return result;
  };

  const reopenPoll = async (pollId: string) => {
    const result = await pollService.reopenPoll(pollId);
    if (result) {
      dispatch(pollReopenedSocket(result));
    }
    return result;
  };

  const deletePoll = async (pollId: string) => {
    const result = await pollService.deletePoll(pollId);
    dispatch(pollDeletedSocket({ pollId }));
    return result;
  };

  return {
    activePolls,
    closedPolls,
    myPolls,
    voters,
    votersLoading,
    votersError,
    loadActivePolls,
    loadClosedPolls,
    loadMyPolls,
    loadPollVoters,
    submitNewPoll,
    submitVote,
    publishPoll,
    closePoll,
    reopenPoll,
    deletePoll,
  };
};

export default usePolls;
