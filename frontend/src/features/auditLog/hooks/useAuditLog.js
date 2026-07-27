import { useDispatch, useSelector } from 'react-redux'
import { loadAuditLogs } from '../store/auditLogSlice.js'

/**
 * Custom hook serving as the controller for Audit Log Viewer states.
 */
export const useAuditLog = () => {
  const dispatch = useDispatch()

  const logs = useSelector((state) => state.auditLog.list)
  const total = useSelector((state) => state.auditLog.total)
  const page = useSelector((state) => state.auditLog.page)
  const limit = useSelector((state) => state.auditLog.limit)
  const totalPages = useSelector((state) => state.auditLog.totalPages)
  const loading = useSelector((state) => state.auditLog.loading)
  const error = useSelector((state) => state.auditLog.error)

  const fetchLogs = (pageNumber = 1, limitNumber = 10) => {
    dispatch(loadAuditLogs({ page: pageNumber, limit: limitNumber }))
  }

  return {
    logs,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    fetchLogs,
  }
}

export default useAuditLog
