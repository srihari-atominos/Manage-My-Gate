import { useEffect, useState, useCallback } from 'react';
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
  } = useSelector((state: RootState) => state.roleBuilder);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch roles when pagination or search changes
  useEffect(() => {
    dispatch(fetchRolesAsync({ page: currentPage, limit: rowsPerPage, search: searchQuery }));
  }, [dispatch, currentPage, rowsPerPage, searchQuery]);

  const loadPermissions = useCallback(() => {
    dispatch(fetchPermissionsAsync());
  }, [dispatch]);

  const openCreateModal = () => {
    setSelectedRole(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (role: RoleData) => {
    setSelectedRole(role);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setSelectedRole(null);
    setIsFormModalOpen(false);
  };

  const openDeleteModal = (role: RoleData) => {
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedRole(null);
    setIsDeleteModalOpen(false);
  };

  const handleSaveRole = async (data: RoleData) => {
    if (selectedRole?.id || selectedRole?._id) {
      const roleId = selectedRole.id || selectedRole._id || '';
      return await dispatch(updateRoleAsync({ roleId, updateData: data })).unwrap();
    } else {
      return await dispatch(createRoleAsync(data)).unwrap();
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!selectedRole?.id && !selectedRole?._id) return;
    const roleId = selectedRole.id || selectedRole._id || '';
    await dispatch(deleteRoleAsync(roleId)).unwrap();
    setIsDeleteModalOpen(false);
    setSelectedRole(null);
  };

  const handleRefresh = () => {
    dispatch(fetchRolesAsync({ page: currentPage, limit: rowsPerPage, search: searchQuery }));
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
