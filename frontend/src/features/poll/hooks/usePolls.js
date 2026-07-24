import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { 
  fetchActivePolls, 
  fetchClosedPolls, 
  fetchMyPolls, 
  createPoll, 
  voteOnPoll 
} from '../store/pollSlice';
import { pollApi } from '../services/pollApi';

export const usePolls = () => {
  const dispatch = useDispatch();
  const { activePolls, closedPolls, myPolls } = useSelector((state) => state.poll);

  const loadActivePolls = useCallback((params) => {
    dispatch(fetchActivePolls(params));
  }, [dispatch]);

  const loadClosedPolls = useCallback((params) => {
    dispatch(fetchClosedPolls(params));
  }, [dispatch]);

  const loadMyPolls = useCallback((params) => {
    dispatch(fetchMyPolls(params));
  }, [dispatch]);

  const submitNewPoll = async (pollData) => {
    return await dispatch(createPoll(pollData)).unwrap();
  };

  const submitVote = async (pollId, optionIndex) => {
    return await dispatch(voteOnPoll({ id: pollId, optionIndex })).unwrap();
  };

  const publishPoll = async (pollId) => {
    return await pollApi.publishPoll(pollId);
  };

  const closePoll = async (pollId) => {
    return await pollApi.closePoll(pollId);
  };

  const deletePoll = async (pollId) => {
    return await pollApi.deletePoll(pollId);
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
    deletePoll
  };
};
