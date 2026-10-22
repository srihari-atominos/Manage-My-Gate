import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useSocket } from '../../../hooks/useSocket'
import {
  pollCreatedSocket,
  pollUpdatedSocket,
  pollPublishedSocket,
  pollClosedSocket,
  pollReopenedSocket,
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
  // useSocket() returns { socket, isConnected, emit }; the shared hook joins the org room on connect
  const { socket, isConnected } = useSocket()
  const { user } = useAuth()
  const connectedBeforeRef = useRef(false)

  // Remember that we have been connected so only a genuine reconnect triggers a resync
  useEffect(() => {
    if (!isConnected) return undefined
    return () => {
      connectedBeforeRef.current = true
    }
  }, [isConnected])

  useEffect(() => {
    if (!socket || !isConnected) return

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

    // Events missed while disconnected are not replayed: resync after a reconnect (not the first connect)
    if (connectedBeforeRef.current) handleReconnect()
    socket.on('poll_created', handlePollCreated)
    socket.on('poll_updated', handlePollUpdated)
    socket.on('poll_published', handlePollPublished)
    socket.on('poll_closed', handlePollClosed)
    socket.on('poll_reopened', handlePollReopened)
    socket.on('poll_vote_added', handlePollVoteAdded)
    socket.on('poll_vote_removed', handlePollVoteRemoved)
    socket.on('poll_deleted', handlePollDeleted)

    return () => {
      socket.off('poll_created', handlePollCreated)
      socket.off('poll_updated', handlePollUpdated)
      socket.off('poll_published', handlePollPublished)
      socket.off('poll_closed', handlePollClosed)
      socket.off('poll_reopened', handlePollReopened)
      socket.off('poll_vote_added', handlePollVoteAdded)
      socket.off('poll_vote_removed', handlePollVoteRemoved)
      socket.off('poll_deleted', handlePollDeleted)
    }
  }, [socket, isConnected, dispatch, activeTab, searchQuery, sortOption, user])
}
