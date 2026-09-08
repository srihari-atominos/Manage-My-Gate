import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { io } from 'socket.io-client'
import { useSelector } from 'react-redux'
import config from '../../../config/config.js'
import { addRealTimeNotification } from '../store/notificationSlice.js'

/**
 * Custom hook to manage the real-time Socket.io connection and listeners
 * for incoming notification events.
 *
 * @param {string} userId - The unique ID of the authenticated user.
 */
export const useNotificationSocket = (userId) => {
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth || {})
  const activeOrgId = user?.orgId || user?.organizationId

  useEffect(() => {
    if (!userId || !token) {
      return
    }

    // Resolve socket URL from environment configuration with backend fallback
    const socketUrl = config.socketUrl

    const socket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    const joinRoom = () => {
      socket.emit('join_room', `user:${userId}`)
    }

    if (socket.connected) {
      joinRoom()
    }
    socket.on('connect', joinRoom)

    socket.on('INCOMING_NOTIFICATION', (payload) => {
      // Community Isolation: Ignore real-time notifications belonging to another organization
      // Invitations (type === 'INVITATION') and global notifications (orgId === null) are always accepted.
      if (
        payload?.orgId &&
        activeOrgId &&
        String(payload.orgId) !== String(activeOrgId) &&
        payload.type !== 'INVITATION'
      ) {
        return
      }

      dispatch(addRealTimeNotification(payload))
    })

    return () => {
      socket.off('INCOMING_NOTIFICATION')
      socket.disconnect()
    }
  }, [userId, token, activeOrgId, dispatch])
}

export default useNotificationSocket
