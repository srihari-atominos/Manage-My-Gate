import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import config from '../../../config/config.js'
import { logout } from '../store/authSlice'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

/**
 * useAuthSocket Custom Hook
 *
 * Manages WebSocket connection for real-time auth event listening.
 * Listens for user-specific session revocation events.
 */
export const useAuthSocket = () => {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const user = useSelector((state) => state.auth.user)
  const token = useSelector((state) => state.auth.token)
  const socketRef = useRef(null)

  useEffect(() => {
    // Only connect if user is authenticated and token exists
    if (!user || !user.id || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socketUrl = config.socketUrl

    // Connect to WebSocket with token authentication
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })
    socketRef.current = socket

    // Join room dedicated to current user
    socket.on('connect', () => {
      socket.emit('join_room', `user:${user.id}`)
    })

    // Listen to session revocation events
    const handleSessionRevoked = (data) => {
      // Trigger error toast and immediately logout user
      toast.error(t('auth.session.revoked', 'Your session has been revoked. Please log in again.'))
      dispatch(logout())
    }

    socket.on('SESSION_REVOKED', handleSessionRevoked)

    return () => {
      socket.off('SESSION_REVOKED', handleSessionRevoked)
      socket.disconnect()
      socketRef.current = null
    }
  }, [dispatch, user, token, t])

  return socketRef.current
}

export default useAuthSocket
