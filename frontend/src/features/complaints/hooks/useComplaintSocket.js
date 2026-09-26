import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { io } from 'socket.io-client'
import config from '../../../config/config.js'
import {
  updateComplaintInList,
  addComplaintToList,
  fetchDashboardAnalytics,
} from '../store/complaintSlice'
import { updateSettingsLocally } from '../store/complaintSettingsSlice'

const SOCKET_URL = config.socketUrl

export const useComplaintSocket = (token) => {
  const dispatch = useDispatch()

  useEffect(() => {
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })

    const handleConnect = () => {
      console.log('Complaint socket connected')
    }

    const handleCreated = (complaint) => {
      dispatch(addComplaintToList(complaint))
      dispatch(fetchDashboardAnalytics()) // Re-fetch analytics on new event
    }

    const handleUpdated = (complaint) => {
      dispatch(updateComplaintInList(complaint))
      dispatch(fetchDashboardAnalytics()) // Re-fetch analytics on update
    }

    const handleSettingsUpdated = (settings) => {
      dispatch(updateSettingsLocally(settings))
    }

    const handleDisconnect = () => {
      console.log('Complaint socket disconnected')
    }

    socket.on('connect', handleConnect)
    socket.on('complaint_created', handleCreated)
    socket.on('complaint_updated', handleUpdated)
    socket.on('complaint_assigned', handleUpdated)
    socket.on('complaint_started', handleUpdated)
    socket.on('complaint_completed', handleUpdated)
    socket.on('complaint_closed', handleUpdated)
    socket.on('complaint_escalated', handleUpdated)
    socket.on('complaints:settings:updated', handleSettingsUpdated)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('complaint_created', handleCreated)
      socket.off('complaint_updated', handleUpdated)
      socket.off('complaint_assigned', handleUpdated)
      socket.off('complaint_started', handleUpdated)
      socket.off('complaint_completed', handleUpdated)
      socket.off('complaint_closed', handleUpdated)
      socket.off('complaint_escalated', handleUpdated)
      socket.off('complaints:settings:updated', handleSettingsUpdated)
      socket.off('disconnect', handleDisconnect)
      socket.disconnect()
    }
  }, [token, dispatch])
}

export default useComplaintSocket
