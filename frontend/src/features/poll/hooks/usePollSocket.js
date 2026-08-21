import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useSocket } from '../../../hooks/useSocket'
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
} from '../store/pollSlice'
import { usePolls } from './usePolls'
import logger from '../../../utils/logger'
import { useAuth } from '../../auth/hooks/useAuth'

export const usePollSocket = (activeTab, searchQuery, sortOption) => {
  const dispatch = useDispatch()
  const socket = useSocket()
  const { user } = useAuth()

  useEffect(() => {
    if (!socket) return

    const handleReconnect = () => {
      logger.info('Socket reconnected, syncing poll data')
      const params = { page: 1, limit: 20, search: searchQuery || '', sort: sortOption || 'latest' }
      if (activeTab === 'active') dispatch(fetchActivePolls(params))
      if (activeTab === 'closed') dispatch(fetchClosedPolls(params))
      if (activeTab === 'my') dispatch(fetchMyPolls(params))
    }

    const handlePollCreated = (poll) => {
      logger.info('Poll created via socket', poll)
      dispatch(pollCreatedSocket(poll))
    }

    const handlePollUpdated = (poll) => {
      logger.info('Poll updated via socket', poll)
      dispatch(pollUpdatedSocket(poll))
    }

    const handlePollPublished = (poll) => {
      logger.info('Poll published via socket', poll)
      dispatch(pollPublishedSocket(poll))
    }

    const handlePollClosed = (poll) => {
      logger.info('Poll closed via socket', poll)
      dispatch(pollClosedSocket(poll))
    }

    const handlePollReopened = (poll) => {
      logger.info('Poll reopened via socket', poll)
      dispatch(pollReopenedSocket(poll))
    }

    const handlePollVoteAdded = (payload) => {
      logger.info('Poll vote added via socket', payload)
      dispatch(pollVoteAddedSocket({ ...payload, currentUserId: user?._id || user?.id }))
    }

    const handlePollVoteRemoved = (payload) => {
      logger.info('Poll vote removed via socket', payload)
      dispatch(pollVoteRemovedSocket({ ...payload, currentUserId: user?._id || user?.id }))
    }

    const handlePollDeleted = (payload) => {
      logger.info('Poll deleted via socket', payload)
      dispatch(pollDeletedSocket(payload))
    }

    socket.on('connect', handleReconnect)
    socket.on('poll_created', handlePollCreated)
    socket.on('poll_updated', handlePollUpdated)
    socket.on('poll_published', handlePollPublished)
    socket.on('poll_closed', handlePollClosed)
    socket.on('poll_reopened', handlePollReopened)
    socket.on('poll_vote_added', handlePollVoteAdded)
    socket.on('poll_vote_removed', handlePollVoteRemoved)
    socket.on('poll_deleted', handlePollDeleted)

    return () => {
      socket.off('connect', handleReconnect)
      socket.off('poll_created', handlePollCreated)
      socket.off('poll_updated', handlePollUpdated)
      socket.off('poll_published', handlePollPublished)
      socket.off('poll_closed', handlePollClosed)
      socket.off('poll_reopened', handlePollReopened)
      socket.off('poll_vote_added', handlePollVoteAdded)
      socket.off('poll_vote_removed', handlePollVoteRemoved)
      socket.off('poll_deleted', handlePollDeleted)
    }
  }, [socket, dispatch, activeTab, searchQuery, sortOption, user])
}
