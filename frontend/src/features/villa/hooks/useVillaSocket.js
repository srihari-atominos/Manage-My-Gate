import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import config from '../../../config/config.js'
import { fetchVillasAsync, fetchVillaStatsAsync, fetchVillaByIdAsync } from '../store/villaSlice'
import logger from '../../../utils/logger'

export const useVillaSocket = (orgId) => {
  const dispatch = useDispatch()
  const socketRef = useRef(null)

  const { currentPage, rowsPerPage, selectedVilla } = useSelector((state) => state.villa)

  useEffect(() => {
    if (!orgId) return

    // Prevent duplicate connections on remount
    if (!socketRef.current) {
      const socketUrl = config.socketUrl
      logger.info(`Initializing real-time villa socket connection for org room: org:${orgId}`)

      socketRef.current = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      })
    }

    const socket = socketRef.current

    const refreshVillas = () => {
      dispatch(fetchVillasAsync({ page: currentPage, limit: rowsPerPage }))
      dispatch(fetchVillaStatsAsync())
    }

    const refreshSingleVillaIfNeeded = (payload) => {
      const villaId = payload?._id || payload?.id || payload?.villaId
      if (selectedVilla && selectedVilla._id === villaId) {
        dispatch(fetchVillaByIdAsync(selectedVilla._id))
      }
    }

    socket.on('connect', () => {
      logger.info(`Villa Socket connected successfully. Joining room: org:${orgId}`)
      socket.emit('join_room', `org:${orgId}`)
    })

    socket.on('unit_created', (payload) => {
      logger.info('Real-time notification: unit_created', payload)
      refreshVillas()
    })

    socket.on('unit_updated', (payload) => {
      logger.info('Real-time notification: unit_updated', payload)
      refreshVillas()
      refreshSingleVillaIfNeeded(payload)
    })

    socket.on('resident_assigned', (payload) => {
      logger.info('Real-time notification: resident_assigned', payload)
      refreshVillas()
      refreshSingleVillaIfNeeded(payload)
    })

    socket.on('resident_type_updated', (payload) => {
      logger.info('Real-time notification: resident_type_updated', payload)
      refreshVillas()
      refreshSingleVillaIfNeeded(payload)
    })

    // Clean up connections and listeners
    return () => {
      logger.info(`Disconnecting villa socket listeners and leaving room: org:${orgId}`)
      socket.off('unit_created')
      socket.off('unit_updated')
      socket.off('resident_assigned')
      socket.off('resident_type_updated')
      socket.disconnect()
      socketRef.current = null // Reset ref on unmount
    }
  }, [dispatch, orgId, currentPage, rowsPerPage, selectedVilla])
}

export default useVillaSocket
