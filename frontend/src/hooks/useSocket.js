import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useSelector } from 'react-redux'
import config from '../config/config.js'

export const useSocket = (namespace = '') => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const { token, user } = useSelector((state) => state.auth)
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId)
  const userId = user?.id || user?._id
  const joinedOrgRef = useRef(null)

  useEffect(() => {
    if (!token) return

    // Ensure namespace starts with slash if provided, e.g. '/platform'
    const socketInstance = io(`${config.socketUrl}${namespace}`, {
      auth: { token },
      // Fall back to long-polling when a proxy or corporate network blocks the WebSocket upgrade
      transports: ['websocket', 'polling'],
      reconnection: true,
      // Keep retrying while the user is signed in; giving up after a handful of attempts left the page
      // permanently stale after a short network outage until the user refreshed.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      withCredentials: true,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
      console.log(`Socket connected: ${socketInstance.id}`)
    })

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false)
      console.log('Socket disconnected')
      // The server closes the connection itself (e.g. on a restart); socket.io does not auto-reconnect then
      if (reason === 'io server disconnect') socketInstance.connect()
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [token, namespace])

  // Subscribe to the personal and tenant rooms. Rooms live on the server connection, so this must run again
  // after every reconnect (isConnected flips) and whenever the active organization changes.
  useEffect(() => {
    if (!socket || !isConnected || namespace) return
    if (userId) socket.emit('join_room', `user:${userId}`)
    if (activeOrgId) {
      const prevOrgId = joinedOrgRef.current
      if (prevOrgId && prevOrgId !== activeOrgId) {
        socket.emit('switch_workspace', { prevOrgId, newOrgId: activeOrgId })
      } else {
        socket.emit('join_room', `org:${activeOrgId}`)
      }
      joinedOrgRef.current = activeOrgId
    }
  }, [socket, isConnected, namespace, userId, activeOrgId])

  const emit = useCallback(
    (eventName, data) => {
      if (socket) {
        socket.emit(eventName, data)
      }
    },
    [socket],
  )

  return { socket, isConnected, emit }
}

export default useSocket
