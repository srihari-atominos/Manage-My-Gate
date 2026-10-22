import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import config from '../../../config/config.js'

/**
 * Custom hook to manage real-time Socket.io updates for Staff Attendance logs & summary metrics
 * Adheres strictly to the frontend-rules: Hook-based socket management, safe cleanup, auto-refresh.
 */
export const useStaffAttendanceSocket = (onAttendanceChange) => {
  const { user, token } = useSelector((state) => state.auth || {})

  // Keep the latest callback in a ref: callers pass a callback that changes with every filter/page change,
  // and listing it as an effect dependency tore down and rebuilt the socket (missing events) each time.
  const callbackRef = useRef(onAttendanceChange)
  useEffect(() => {
    callbackRef.current = onAttendanceChange
  }, [onAttendanceChange])

  const orgId = user?.orgId || user?.organizationId

  useEffect(() => {
    if (!token && !user) return

    const socketUrl = config.socketUrl
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 15000,
      reconnectionDelay: 1000,
    })

    let connectedBefore = false
    socket.on('connect', () => {
      if (orgId) {
        socket.emit('join_room', `org:${orgId}`)
      }
      // Events missed while disconnected are not replayed: reload after a reconnect
      if (connectedBefore) callbackRef.current?.()
      connectedBefore = true
    })

    const handleUpdate = (payload) => {
      if (typeof callbackRef.current === 'function') {
        callbackRef.current(payload)
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
  }, [orgId, token])

  return null
}

export default useStaffAttendanceSocket
