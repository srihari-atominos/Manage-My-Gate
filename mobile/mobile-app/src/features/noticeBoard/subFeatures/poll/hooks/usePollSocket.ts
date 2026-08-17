import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/src/store/store';
import { useAppSocket } from '@/src/hooks/useAppSocket';
import { Poll } from '../services/pollService';
import {
  pollCreatedSocket,
  pollUpdatedSocket,
  pollPublishedSocket,
  pollClosedSocket,
  pollVoteAddedSocket,
  pollVoteRemovedSocket,
  pollDeletedSocket,
  fetchActivePolls,
  fetchClosedPolls,
  fetchMyPolls,
} from '../store/pollSlice';

export const usePollSocket = (
  activeTab: 'active' | 'closed' | 'my',
  searchQuery?: string,
  sortOption?: string
) => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();
  const { user } = useSelector((state: RootState) => (state as any).auth || {});

  useEffect(() => {
    if (!socket) return;

    const handleReconnect = () => {
      console.log('[Socket] Socket reconnected, syncing poll data');
      const params = { page: 1, limit: 20, search: searchQuery || '', sort: sortOption || 'latest' };
      if (activeTab === 'active') dispatch(fetchActivePolls(params));
      if (activeTab === 'closed') dispatch(fetchClosedPolls(params));
      if (activeTab === 'my') dispatch(fetchMyPolls(params));
    };

    const handlePollCreated = (poll: Poll) => {
      console.log('[Socket] Poll created via socket', poll);
      dispatch(pollCreatedSocket(poll));
    };

    const handlePollUpdated = (poll: Poll) => {
      console.log('[Socket] Poll updated via socket', poll);
      dispatch(pollUpdatedSocket(poll));
    };

    const handlePollPublished = (poll: Poll) => {
      console.log('[Socket] Poll published via socket', poll);
      dispatch(pollPublishedSocket(poll));
    };

    const handlePollClosed = (poll: Poll) => {
      console.log('[Socket] Poll closed via socket', poll);
      dispatch(pollClosedSocket(poll));
    };

    const handlePollVoteAdded = (payload: { poll: Poll; residentId: string; optionIndex: number }) => {
      console.log('[Socket] Poll vote added via socket', payload);
      dispatch(
        pollVoteAddedSocket({
          ...payload,
          currentUserId: user?._id || user?.id,
        })
      );
    };

    const handlePollVoteRemoved = (payload: { poll: Poll; residentId: string }) => {
      console.log('[Socket] Poll vote removed via socket', payload);
      dispatch(
        pollVoteRemovedSocket({
          ...payload,
          currentUserId: user?._id || user?.id,
        })
      );
    };

    const handlePollDeleted = (payload: { pollId: string }) => {
      console.log('[Socket] Poll deleted via socket', payload);
      dispatch(pollDeletedSocket(payload));
    };

    socket.on('connect', handleReconnect);
    socket.on('poll_created', handlePollCreated);
    socket.on('poll_updated', handlePollUpdated);
    socket.on('poll_published', handlePollPublished);
    socket.on('poll_closed', handlePollClosed);
    socket.on('poll_vote_added', handlePollVoteAdded);
    socket.on('poll_vote_removed', handlePollVoteRemoved);
    socket.on('poll_deleted', handlePollDeleted);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('poll_created', handlePollCreated);
      socket.off('poll_updated', handlePollUpdated);
      socket.off('poll_published', handlePollPublished);
      socket.off('poll_closed', handlePollClosed);
      socket.off('poll_vote_added', handlePollVoteAdded);
      socket.off('poll_vote_removed', handlePollVoteRemoved);
      socket.off('poll_deleted', handlePollDeleted);
    };
  }, [socket, dispatch, activeTab, searchQuery, sortOption, user]);
};

export default usePollSocket;
