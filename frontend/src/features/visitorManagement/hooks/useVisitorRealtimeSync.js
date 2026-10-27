import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import useSocket from '../../../hooks/useSocket.js'
import { getPasses } from '../store/visitorPassSlice.js'
import {
  fetchHistoryLogs,
  fetchPendingApprovals,
  getActiveVisitors,
} from '../store/visitorLogSlice.js'

// Emitted by backend visitorPass.events.js, visitorLog.socket.js
const VISITOR_EVENTS = [
  'visitor:pass_created',
  'visitor:pass_updated',
  'visitor:pass_revoked',
  'visitor:log_changed',
  'GATE_APPROVAL_RESOLVED',
]

const REFRESH_DEBOUNCE_MS = 400

/**
 * Keeps the Visitor Management lists (passes, history, pending walk-ins, active visitors) in sync with
 * what other users do (guard scans a pass, resident revokes one, a visitor checks out...). Without this the
 * lists only updated after a manual page refresh. Mount once per Visitor Management context view.
 *
 * @param {'Resident'|'Guard'|'Admin'|string} context - the user's visitor console context
 */
export const useVisitorRealtimeSync = (context) => {
  const dispatch = useDispatch()
  const { socket, isConnected } = useSocket()
  const activeOrgId = useSelector((state) => state.workspace?.activeOrganizationId)
  const connectedBeforeRef = useRef(false)

  useEffect(() => {
    if (!socket || !isConnected || !activeOrgId) return undefined

    let timer = null
    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (context === 'Guard') {
          dispatch(
            getPasses({
              orgId: activeOrgId,
              params: { page: 1, limit: 100, statuses: 'PENDING,ACTIVE,EXPIRED' },
            }),
          )
          dispatch(getActiveVisitors(activeOrgId))
          return
        }
        dispatch(getPasses({ orgId: activeOrgId, params: { page: 1, limit: 10 } }))
        dispatch(fetchPendingApprovals(activeOrgId))
        dispatch(fetchHistoryLogs({ orgId: activeOrgId, params: { page: 1, limit: 10 } }))
      }, REFRESH_DEBOUNCE_MS)
    }

    VISITOR_EVENTS.forEach((name) => socket.on(name, refresh))

    // Events missed while disconnected are not replayed: reload after a reconnect (not the first connect)
    if (connectedBeforeRef.current) refresh()
    connectedBeforeRef.current = true

    return () => {
      if (timer) clearTimeout(timer)
      VISITOR_EVENTS.forEach((name) => socket.off(name, refresh))
    }
  }, [socket, isConnected, activeOrgId, context, dispatch])
}

export default useVisitorRealtimeSync
