import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import {
  fetchActivePolls,
  fetchClosedPolls,
  fetchMyPolls,
  createPoll,
  voteOnPoll,
  pollDeletedSocket,
  pollClosedSocket,
  pollReopenedSocket,
  pollPublishedSocket,
} from '../store/pollSlice'
import { pollApi } from '../services/pollApi'

export const usePolls = () => {
  const dispatch = useDispatch()
  const { activePolls, closedPolls, myPolls } = useSelector((state) => state.poll)

  const loadActivePolls = useCallback(
    (params) => {
      dispatch(fetchActivePolls(params))
    },
    [dispatch],
  )

  const loadClosedPolls = useCallback(
    (params) => {
      dispatch(fetchClosedPolls(params))
    },
    [dispatch],
  )

  const loadMyPolls = useCallback(
    (params) => {
      dispatch(fetchMyPolls(params))
    },
    [dispatch],
  )

  const submitNewPoll = async (pollData) => {
    return await dispatch(createPoll(pollData)).unwrap()
  }

  const submitVote = async (pollId, optionIndex) => {
    return await dispatch(voteOnPoll({ id: pollId, optionIndex })).unwrap()
  }

  const publishPoll = async (pollId) => {
    const result = await pollApi.publishPoll(pollId)
    if (result?.data) {
      dispatch(pollPublishedSocket(result.data))
    }
    return result
  }

  const closePoll = async (pollId) => {
    const result = await pollApi.closePoll(pollId)
    if (result?.data) {
      dispatch(pollClosedSocket(result.data))
    }
    return result
  }

  const reopenPoll = async (pollId) => {
    const result = await pollApi.reopenPoll(pollId)
    if (result?.data) {
      dispatch(pollReopenedSocket(result.data))
    }
    return result
  }

  const deletePoll = async (pollId) => {
    const result = await pollApi.deletePoll(pollId)
    dispatch(pollDeletedSocket({ pollId }))
    return result
  }

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
    reopenPoll,
    deletePoll,
  }
}
