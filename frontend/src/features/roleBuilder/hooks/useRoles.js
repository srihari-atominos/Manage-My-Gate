import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchRolesAsync,
  createRoleAsync,
  updateRoleAsync,
  deleteRoleAsync,
  fetchPermissions,
} from '../roleSlice'

/**
 * useRoles Custom Hook
 * 
 * Reusable controller hook encapsulating all Redux selectors and actions
 * for the Role Builder feature. Follows the "Thin View" architectural pattern.
 */
export const useRoles = () => {
  const dispatch = useDispatch()
  const { roles, isLoading, error, permissionsList, isPermissionsLoading } = useSelector((state) => state.roleBuilder)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState(null)

  // Fetch roles on mount
  useEffect(() => {
    dispatch(fetchRolesAsync())
  }, [dispatch])

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
    if (selectedRoleForEdit) {
      // Edit mode
      await dispatch(updateRoleAsync({ roleId: selectedRoleForEdit.id, roleData: data }))
    } else {
      // Create mode
      await dispatch(createRoleAsync(data))
    }
    closeModal()
  }

  const handleDeleteRole = (id) => {
    dispatch(deleteRoleAsync(id))
  }

  return {
    roles,
    isLoading,
    error,
    permissionsList,
    isPermissionsLoading,
    isModalOpen,
    selectedRoleForEdit,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSaveRole,
    handleDeleteRole,
    loadPermissions,
  }
}

export default useRoles
