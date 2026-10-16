import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import config from '../../../config/config.js'
import { logout, switchWorkspaceContext } from '../store/authSlice'
import { loadCurrentModules } from '../../workspace/store/workspaceSlice'
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
  // Primitives, not the user object: that object is replaced on every token/workspace refresh, which would
  // tear down a socket that is still connecting ("WebSocket is closed before the connection is established").
  const userId = useSelector((state) => state.auth.user?.id)
  const orgId = useSelector((state) => state.auth.user?.orgId)
  const token = useSelector((state) => state.auth.token)
  const socketRef = useRef(null)
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    // Only connect if user is authenticated and token exists
    if (!userId || !token) {
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
      socket.emit('join_room', `user:${userId}`)
      if (orgId) {
        socket.emit('join_room', `org:${orgId}`)
      }
    })

    // Listen to session revocation events
    const handleSessionRevoked = (data) => {
      // Trigger error toast and immediately logout user
      toast.error(
        tRef.current('auth.session.revoked', 'Your session has been revoked. Please log in again.'),
      )
      dispatch(logout())
    }

    // Listen to real-time unit allocation or user updates to refresh state seamlessly
    const handleResidentAssigned = (data) => {
      if (data?.userId === userId || data?.residentId === userId) {
        toast.success(tRef.current('auth.unit.allocated', 'You have been allocated to a unit.'))
        dispatch(switchWorkspaceContext({ targetOrgId: orgId, targetVillaId: data.villaId }))
      }
    }

    const handleRecordUpdated = (data) => {
      if (data?.type === 'USER' && data?.userId === userId) {
        dispatch(switchWorkspaceContext({ targetOrgId: orgId }))
      }
      if (data?.type === 'ORGANIZATION' && (data?.orgId === orgId || data?.data?.orgId === orgId)) {
        // Refresh token context to capture any new role/platform permissions
        dispatch(switchWorkspaceContext({ targetOrgId: orgId }))
        // Refresh the frontend UI features
        dispatch(loadCurrentModules())
      }
    }

    socket.on('SESSION_REVOKED', handleSessionRevoked)
    socket.on('resident_assigned', handleResidentAssigned)
    socket.on('RECORD_UPDATED', handleRecordUpdated)

    return () => {
      socket.off('SESSION_REVOKED', handleSessionRevoked)
      socket.off('resident_assigned', handleResidentAssigned)
      socket.off('RECORD_UPDATED', handleRecordUpdated)
      socket.disconnect()
      socketRef.current = null
    }
  }, [dispatch, userId, orgId, token])

  // Hook doesn't need to return anything
}

export default useAuthSocket
