import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import useSocket from '../../../hooks/useSocket.js'
import { fetchStaffVendorsAnalytics } from '../store/complaintSlice'

// Events emitted by backend technician.socket.js / staffUnitAssociation.socket.js / staffAttendance.socket.js
const STAFF_EVENTS = [
  'staff:created',
  'staff:profile_updated',
  'staff:deleted',
  'staff:association_created',
  'staff:association_accepted',
  'staff:association_rejected',
  'staff:association_removed',
  'staff:unit_association_requested',
  'staff:attendance_updated',
]

/**
 * Keeps the Staff & Vendor directory in sync: any staff record, unit association or attendance change
 * reloads the list and analytics. Uses the shared socket, which joins the org room on connect.
 */
export const useStaffVendorSocket = () => {
  const dispatch = useDispatch()
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!socket || !isConnected) return undefined

    const reload = () => {
      dispatch(fetchStaffVendorsAnalytics({}))
    }

    STAFF_EVENTS.forEach((name) => socket.on(name, reload))
    return () => {
      STAFF_EVENTS.forEach((name) => socket.off(name, reload))
    }
  }, [socket, isConnected, dispatch])
}

export default useStaffVendorSocket
