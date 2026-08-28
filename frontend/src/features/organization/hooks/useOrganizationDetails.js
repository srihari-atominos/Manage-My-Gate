import { useDispatch, useSelector } from 'react-redux'
import { loadOrganizationDetails, clearSelectedOrganization } from '../store/organizationSlice.js'

/**
 * Controller hook for managing organization details and summary metrics.
 */
export const useOrganizationDetails = () => {
  const dispatch = useDispatch()

  const selectedOrganization = useSelector((state) => state.organization.selectedOrganization)
  const loading = useSelector((state) => state.organization.detailsLoading)
  const error = useSelector((state) => state.organization.detailsError)

  const fetchDetails = (orgId) => {
    if (orgId) {
      dispatch(loadOrganizationDetails({ orgId }))
    }
  }

  const resetDetails = () => {
    dispatch(clearSelectedOrganization())
  }

  return {
    selectedOrganization,
    organization: selectedOrganization?.organization || null,
    summary: selectedOrganization?.summary || null,
    loading,
    error,
    fetchDetails,
    resetDetails,
  }
}

export default useOrganizationDetails
