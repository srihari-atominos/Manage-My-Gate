import { useDispatch, useSelector } from 'react-redux'
import { loadOrganizations, toggleOrgStatus } from '../store/organizationSlice.js'

/**
 * Custom controller hook to bridge UI components with Organization Redux store.
 */
export const useOrganizationManager = () => {
  const dispatch = useDispatch()

  const organizations = useSelector((state) => state.organization.list)
  const total = useSelector((state) => state.organization.total)
  const page = useSelector((state) => state.organization.page)
  const limit = useSelector((state) => state.organization.limit)
  const totalPages = useSelector((state) => state.organization.totalPages)
  const loading = useSelector((state) => state.organization.loading)
  const error = useSelector((state) => state.organization.error)

  const fetchOrgs = (pageNumber = 1, limitNumber = 10) => {
    dispatch(loadOrganizations({ page: pageNumber, limit: limitNumber }))
  }

  const toggleStatus = (orgId, currentStatus) => {
    dispatch(toggleOrgStatus({ orgId, currentStatus }))
  }

  return {
    organizations,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    fetchOrgs,
    toggleStatus,
  }
}

export default useOrganizationManager
