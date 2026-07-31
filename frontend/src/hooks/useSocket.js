import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

import config from '../config/config.js'

/**
 * Global Socket hook
 * Manages standard socket connection setup.
 */
export const useSocket = (room) => {
  const socketRef = useRef(null)

  useEffect(() => {
    const socketUrl = config.socketUrl

    socketRef.current = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      if (room) {
        if (Array.isArray(room)) {
          room.forEach((r) => {
            if (r) socket.emit('join_room', r)
          })
        } else {
          socket.emit('join_room', room)
        }
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [room])

  return socketRef.current
}

export default useSocket
