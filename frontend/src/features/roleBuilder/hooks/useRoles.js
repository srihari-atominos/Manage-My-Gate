import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchRolesAsync,
  createRoleAsync,
  updateRoleAsync,
  deleteRoleAsync,
  fetchPermissions,
  setCurrentPage,
  setRowsPerPage,
} from '../store/roleSlice'

/**
 * useRoles Custom Hook
 *
 * Reusable controller hook encapsulating all Redux selectors and actions
 * for the Role Builder feature. Follows the "Thin View" architectural pattern.
 */
export const useRoles = () => {
  const dispatch = useDispatch()
  const {
    roles,
    isLoading,
    error,
    permissionsList,
    isPermissionsLoading,
    totalRecords,
    currentPage,
    totalPages,
    rowsPerPage,
  } = useSelector((state) => state.roleBuilder)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState(null)

  // Fetch roles when pagination states change
  useEffect(() => {
    dispatch(fetchRolesAsync({ page: currentPage, limit: rowsPerPage }))
  }, [dispatch, currentPage, rowsPerPage])

  const loadPermissions = useCallback(() => {
    dispatch(fetchPermissions())
  }, [dispatch])

  const openCreateModal = () => {
    setSelectedRoleForEdit(null)
    setIsModalOpen(true)
  }

  const openEditModal = (role) => {
    setSelectedRoleForEdit(role)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setSelectedRoleForEdit(null)
    setIsModalOpen(false)
  }

  const handleSaveRole = async (data) => {
    try {
      if (selectedRoleForEdit) {
        // Edit mode
        await dispatch(updateRoleAsync({ roleId: selectedRoleForEdit.id, roleData: data })).unwrap()
      } else {
        // Create mode
        await dispatch(createRoleAsync(data)).unwrap()
      }
      closeModal()
      window.location.reload()
    } catch (err) {
      console.error('Failed to save role:', err)
    }
  }

  const handleDeleteRole = async (id) => {
    try {
      await dispatch(deleteRoleAsync(id)).unwrap()
      window.location.reload()
    } catch (err) {
      console.error('Failed to delete role:', err)
    }
  }

  const handlePageChange = (newPage) => {
    dispatch(setCurrentPage(newPage))
  }

  const handleRowsPerPageChange = (newLimit) => {
    dispatch(setRowsPerPage(newLimit))
    dispatch(setCurrentPage(1))
  }

  return {
    roles,
    isLoading,
    error,
    permissionsList,
    isPermissionsLoading,
    isModalOpen,
    selectedRoleForEdit,
    totalRecords,
    currentPage,
    totalPages,
    rowsPerPage,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSaveRole,
    handleDeleteRole,
    loadPermissions,
    handlePageChange,
    handleRowsPerPageChange,
  }
}

export default useRoles
