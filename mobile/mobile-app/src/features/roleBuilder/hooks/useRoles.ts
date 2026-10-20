import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  fetchRolesAsync,
  createRoleAsync,
  updateRoleAsync,
  deleteRoleAsync,
  fetchPermissionsAsync,
  setCurrentPage,
  setRowsPerPage,
  clearRoleError,
} from '../store/roleSlice';
import { RoleData } from '../services/roleService';
import { hasRolePermission } from '../roleAccess';
import type { RoleScope } from '../roleScopes';
import { switchWorkspaceContextThunk } from '../../auth/store/authSlice';

export const useRoles = () => {
  const dispatch = useDispatch<AppDispatch>();

  const {
    roles,
    isLoading,
    isPermissionsLoading,
    error,
    permissionsList,
    totalRecords,
    currentPage,
    totalPages,
    rowsPerPage,
    scopeCounts,
  } = useSelector((state: RootState) => state.roleBuilder);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const canReadRoles = hasRolePermission(currentUser, 'read');
  const canCreateRoles = hasRolePermission(currentUser, 'create');
  const canUpdateRoles = hasRolePermission(currentUser, 'update');
  const canDeleteRoles = hasRolePermission(currentUser, 'delete');

  const [scopeFilter, setScopeFilterState] = useState<RoleScope | 'ALL'>('ALL');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const emptyListRetryForOrg = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const roleScope = scopeFilter === 'ALL' ? undefined : scopeFilter;

  // Fetch roles when pagination, search or the scope filter changes
  useEffect(() => {
    if (canReadRoles) {
      dispatch(fetchRolesAsync({ page: currentPage, limit: rowsPerPage, search: debouncedSearch, roleScope }));
    }
  }, [dispatch, currentPage, rowsPerPage, debouncedSearch, roleScope, canReadRoles]);

  // Workspace switching resets tenant slices for safety. If that reset wins the
  // initial request race, retry once so an existing community never shows an
  // empty Role Builder until the user manually pulls to refresh.
  useEffect(() => {
    const orgId = currentUser?.activeOrgId || currentUser?.orgId || currentUser?.organizationId;
    if (!canReadRoles || isLoading || error || roles.length > 0 || !orgId || emptyListRetryForOrg.current === orgId) return;
    emptyListRetryForOrg.current = orgId;
    const retryTimer = setTimeout(() => {
      dispatch(fetchRolesAsync({ page: currentPage, limit: rowsPerPage, search: debouncedSearch, roleScope }));
    }, 250);
    return () => clearTimeout(retryTimer);
  }, [canReadRoles, currentUser?.activeOrgId, currentUser?.orgId, currentUser?.organizationId, isLoading, error, roles.length, currentPage, rowsPerPage, debouncedSearch, roleScope, dispatch]);

  const loadPermissions = useCallback(() => {
    dispatch(fetchPermissionsAsync());
  }, [dispatch]);

  const openCreateModal = () => {
    if (!canCreateRoles) {
      Alert.alert('Permission required', 'Your account needs the roles:create permission to create a role.');
      return;
    }
    setSelectedRole(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (role: RoleData) => {
    if (!canUpdateRoles) {
      Alert.alert(
        'Permission required',
        'Your account needs the roles:update permission to edit a role. Ask a platform administrator to grant it, then sign in again.'
      );
      return;
    }
    setSelectedRole(role);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setSelectedRole(null);
    setIsFormModalOpen(false);
  };

  const openDeleteModal = (role: RoleData) => {
    if (!canDeleteRoles) {
      Alert.alert('Permission required', 'Your account needs the roles:delete permission to delete a role.');
      return;
    }
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedRole(null);
    setIsDeleteModalOpen(false);
  };

  const handleSaveRole = async (data: RoleData) => {
    if (!canUpdateRoles && (selectedRole?.id || selectedRole?._id)) {
      Alert.alert(
        'Permission required',
        'Your account needs the roles:update permission to edit a role. Ask a platform administrator to grant it, then sign in again.'
      );
      return null;
    }

    try {
      if (selectedRole?.id || selectedRole?._id) {
        const roleId = selectedRole.id || selectedRole._id || '';
        await dispatch(updateRoleAsync({ roleId, roleData: data })).unwrap();

        // Socket delivery is best-effort on mobile and web. Refresh the active
        // session so a changed role takes effect immediately in the dashboard.
        await dispatch(switchWorkspaceContextThunk({})).unwrap();
      } else {
        await dispatch(createRoleAsync(data)).unwrap();
      }

      Alert.alert(
        'Success',
        selectedRole ? `Role "${data.name}" updated successfully!` : `Role "${data.name}" created successfully!`
      );
      closeFormModal();
      // The fulfilled create/update reducers already update the current list.
      // Do not refetch here: a tenant-reset race can replace the visible roles
      // with an empty list immediately after a successful save.
      return true;
    } catch (err: any) {
      const message = typeof err === 'string' ? err : err?.message || 'Failed to save role permissions';
      Alert.alert('Unable to save role', message);
      // The error is handled here. Do not rethrow it: rethrowing from the sheet
      // creates an unhandled promise and duplicates the browser error log.
      return null;
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!selectedRole?.id && !selectedRole?._id) return;
    const roleId = selectedRole.id || selectedRole._id || '';
    try {
      await dispatch(deleteRoleAsync(roleId)).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedRole(null);
      // Refresh so the page fills up again and the scope counts stay accurate.
      dispatch(fetchRolesAsync({ page: currentPage, limit: rowsPerPage, search: debouncedSearch, roleScope }));
    } catch (err: any) {
      const message = typeof err === 'string' ? err : err?.message || 'Failed to delete role';
      Alert.alert('Unable to delete role', message);
      closeDeleteModal();
    }
  };

  const handleRefresh = () => {
    dispatch(fetchRolesAsync({ page: currentPage, limit: rowsPerPage, search: searchQuery, roleScope }));
  };

  const setScopeFilter = (scope: RoleScope | 'ALL') => {
    setScopeFilterState(scope);
    dispatch(setCurrentPage(1));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    dispatch(setCurrentPage(1));
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setCurrentPage(newPage));
  };

  const handleRowsPerPageChange = (newLimit: number) => {
    dispatch(setRowsPerPage(newLimit));
    dispatch(setCurrentPage(1));
  };

  const dismissError = () => {
    dispatch(clearRoleError());
  };

  return {
    roles,
    isLoading,
    isPermissionsLoading,
    error,
    permissionsList,
    totalRecords,
    currentPage,
    totalPages,
    rowsPerPage,
    scopeCounts,
    scopeFilter,
    setScopeFilter,
    canReadRoles,
    canCreateRoles,
    canUpdateRoles,
    canDeleteRoles,
    isFormModalOpen,
    isDeleteModalOpen,
    selectedRole,
    searchQuery,
    openCreateModal,
    openEditModal,
    closeFormModal,
    openDeleteModal,
    closeDeleteModal,
    handleSaveRole,
    handleConfirmDeleteRole,
    handleRefresh,
    handleSearch,
    handlePageChange,
    handleRowsPerPageChange,
    setCurrentPage: handlePageChange,
    setRowsPerPage: handleRowsPerPageChange,
    loadPermissions,
    dismissError,
  };
};

export default useRoles;
