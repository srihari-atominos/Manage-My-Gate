import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import config from '../../../config/config.js'

/**
 * Custom hook to manage real-time Socket.io updates for Staff Attendance logs & summary metrics
 * Adheres strictly to the frontend-rules: Hook-based socket management, safe cleanup, auto-refresh.
 */
export const useStaffAttendanceSocket = (onAttendanceChange) => {
  const { user, token } = useSelector((state) => state.auth || {})

  useEffect(() => {
    if (!token && !user) return

    const socketUrl = config.socketUrl
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      const orgId = user?.orgId || user?.organizationId
      if (orgId) {
        socket.emit('join_room', `org:${orgId}`)
      }
    })

    const handleUpdate = (payload) => {
      if (typeof onAttendanceChange === 'function') {
        onAttendanceChange(payload)
      }
    }

    socket.on('staff:attendance_updated', handleUpdate)
    socket.on('staff:entry', handleUpdate)
    socket.on('staff:exit', handleUpdate)

    return () => {
      socket.off('staff:attendance_updated', handleUpdate)
      socket.off('staff:entry', handleUpdate)
      socket.off('staff:exit', handleUpdate)
      socket.disconnect()
    }
  }, [user, token, onAttendanceChange])

  return null
}

export default useStaffAttendanceSocket
