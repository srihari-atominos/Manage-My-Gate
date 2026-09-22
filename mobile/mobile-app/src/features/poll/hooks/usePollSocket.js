import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSocket } from '../../../hooks/useAppSocket';
import {
  socketPollCreated,
  socketPollUpdated,
  socketPollClosed,
  socketVoteAdded,
  fetchActivePolls,
  fetchClosedPolls,
} from '../store/pollSlice';

/**
 * usePollSocket Hook
 * Real-time listener for community poll events over WebSocket.
 */
export function usePollSocket() {
  const dispatch = useDispatch();
  const { socket } = useAppSocket();
  const { user } = useSelector((state) => state.auth || {});

  useEffect(() => {
    if (!socket) return;

    if (user?.orgId) {
      socket.emit('join_room', `org:${user.orgId}`);
    }

    const handlePollCreated = (poll) => {
      dispatch(socketPollCreated(poll));
    };

    const handlePollUpdated = (poll) => {
      dispatch(socketPollUpdated(poll));
    };

    const handlePollClosed = (poll) => {
      dispatch(socketPollClosed(poll));
    };

    const handleVoteAdded = (payload) => {
      dispatch(socketVoteAdded(payload));
    };

    const handleReconnect = () => {
      if (user?.orgId) {
        socket.emit('join_room', `org:${user.orgId}`);
      }
      dispatch(fetchActivePolls());
      dispatch(fetchClosedPolls());
    };

    socket.on('poll_created', handlePollCreated);
    socket.on('poll_updated', handlePollUpdated);
    socket.on('poll_closed', handlePollClosed);
    socket.on('poll_finalized', handlePollClosed);
    socket.on('poll_vote_added', handleVoteAdded);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('poll_created', handlePollCreated);
      socket.off('poll_updated', handlePollUpdated);
      socket.off('poll_closed', handlePollClosed);
      socket.off('poll_finalized', handlePollClosed);
      socket.off('poll_vote_added', handleVoteAdded);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, user?.orgId, dispatch]);
}

export default usePollSocket;
