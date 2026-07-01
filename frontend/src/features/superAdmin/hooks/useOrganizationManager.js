import { useDispatch, useSelector } from 'react-redux';
import { loadOrganizations, toggleOrgStatus } from '../store/superAdminSlice.js';

/**
 * Custom controller hook to bridge UI components with Super Admin Redux store.
 */
export const useOrganizationManager = () => {
  const dispatch = useDispatch();

  const organizations = useSelector((state) => state.superAdmin.list);
  const total = useSelector((state) => state.superAdmin.total);
  const page = useSelector((state) => state.superAdmin.page);
  const limit = useSelector((state) => state.superAdmin.limit);
  const totalPages = useSelector((state) => state.superAdmin.totalPages);
  const loading = useSelector((state) => state.superAdmin.loading);
  const error = useSelector((state) => state.superAdmin.error);

  const fetchOrgs = (pageNumber = 1, limitNumber = 10) => {
    dispatch(loadOrganizations({ page: pageNumber, limit: limitNumber }));
  };

  const toggleStatus = (orgId, currentStatus) => {
    dispatch(toggleOrgStatus({ orgId, currentStatus }));
  };

  const displayOrganizations = organizations.filter(org => !org.isPlatform);

  return {
    organizations: displayOrganizations,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    fetchOrgs,
    toggleStatus,
  };
};

export default useOrganizationManager;
