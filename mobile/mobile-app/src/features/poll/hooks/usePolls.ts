import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchActivePolls,
  fetchClosedPolls,
  fetchMyPolls,
  createPoll,
  voteOnPoll,
  pollDeletedSocket,
  pollClosedSocket,
  pollPublishedSocket,
} from '../store/pollSlice';
import { pollApi } from '../services/pollApi';

export const usePolls = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activePolls, closedPolls, myPolls } = useSelector((state: RootState) => state.poll);

  const loadActivePolls = useCallback(
    (params: any) => {
      dispatch(fetchActivePolls(params));
    },
    [dispatch]
  );

  const loadClosedPolls = useCallback(
    (params: any) => {
      dispatch(fetchClosedPolls(params));
    },
    [dispatch]
  );

  const loadMyPolls = useCallback(
    (params: any) => {
      dispatch(fetchMyPolls(params));
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
    const result = await pollApi.publishPoll(pollId);
    if (result?.data) {
      dispatch(pollPublishedSocket(result.data));
    }
    return result;
  };

  const closePoll = async (pollId: string) => {
    const result = await pollApi.closePoll(pollId);
    if (result?.data) {
      dispatch(pollClosedSocket(result.data));
    }
    return result;
  };

  const deletePoll = async (pollId: string) => {
    const result = await pollApi.deletePoll(pollId);
    dispatch(pollDeletedSocket({ pollId }));
    return result;
  };

  return {
    activePolls,
    closedPolls,
    myPolls,
    loadActivePolls,
    loadClosedPolls,
    loadMyPolls,
    submitNewPoll,
    submitVote,
    publishPoll,
    closePoll,
    deletePoll,
  };
};
