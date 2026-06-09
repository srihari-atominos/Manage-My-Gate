import { useMemo, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setSearchQuery,
  toggleRole,
  toggleStatus,
  clearRoleFilter,
  setCurrentPage,
  setRowsPerPage,
  fetchUsersAsync,
  inviteUserAsync,
  deleteUserAsync,
  updateUserRolesAsync,
  STATUS_OPTIONS,
} from '../userSlice'
import { fetchRolesAsync } from '../../roleBuilder/roleSlice'

/**
 * useUserList Custom Hook
 * 
 * Reusable controller hook encapsulating all Redux selectors and actions
 * for the user management feature. Follows the "Thin View" architectural pattern.
 */
export const useUserList = () => {
  const dispatch = useDispatch()

  // Selectors
  const {
    users,
    searchQuery,
    selectedRoles,
    statusFilter,
    currentPage,
    rowsPerPage,
    totalRecords,
    totalPages,
    loading,
    error,
  } = useSelector((state) => state.userManagement)

  const { roles } = useSelector((state) => state.roleBuilder)

  // Fetch users when pagination states change
  useEffect(() => {
    dispatch(fetchUsersAsync({ page: currentPage, limit: rowsPerPage }))
  }, [dispatch, currentPage, rowsPerPage])

  // Load roles on mount if not loaded
  useEffect(() => {
    if (!roles || roles.length === 0) {
      dispatch(fetchRolesAsync())
    }
  }, [dispatch, roles])

  // Memoized Dynamic Roles List from Database
  const ROLES = useMemo(() => {
    return roles ? roles.map((r) => r.name) : []
  }, [roles])

  // Memoized Filtered Rows (applied on the currently paginated chunk)
  const filteredUsers = useMemo(() => {
    const term = searchQuery.toLowerCase()
    return users.filter((u) => {
      const matchesSearch =
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)

      const matchesRole =
        selectedRoles.length === 0 ||
        selectedRoles.some((role) => u.role.includes(role))

      const matchesStatus = statusFilter.includes(u.status)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, selectedRoles, statusFilter])

  // Action Dispatchers
  const changeSearchQuery = (query) => dispatch(setSearchQuery(query))
  const changeRoleToggle = (role) => dispatch(toggleRole(role))
  const changeStatusToggle = (status) => dispatch(toggleStatus(status))
  const handleClearRoleFilter = () => dispatch(clearRoleFilter())
  
  // Handlers for page and limit changes
  const handlePageChange = (newPage) => {
    dispatch(setCurrentPage(newPage))
  }
  
  const handleRowsPerPageChange = (newLimit) => {
    dispatch(setRowsPerPage(newLimit))
    dispatch(setCurrentPage(1))
  }

  const removeUser = (id) => dispatch(deleteUserAsync(id))
  const inviteUser = (email) => dispatch(inviteUserAsync(email))

  // Modal State & Handlers
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null)

  const openManageRolesModal = (user) => {
    setSelectedUserForRoles(user)
  }

  const closeManageRolesModal = () => {
    setSelectedUserForRoles(null)
  }

  const handleSaveRoles = (userId, newRoles) => {
    dispatch(updateUserRolesAsync({ userId, newRoles }))
    closeManageRolesModal()
  }

  return {
    // State
    searchQuery,
    selectedRoles,
    statusFilter,
    currentPage,
    rowsPerPage,
    totalPages,
    totalRecords,
    users,
    filteredUsers,
    ROLES,
    STATUS_OPTIONS,
    selectedUserForRoles,
    isLoading: loading,
    error,

    // Callbacks/Actions
    setSearchQuery: changeSearchQuery,
    toggleRole: changeRoleToggle,
    toggleStatus: changeStatusToggle,
    clearRoleFilter: handleClearRoleFilter,
    setCurrentPage: handlePageChange,
    setRowsPerPage: handleRowsPerPageChange,
    deleteUser: removeUser,
    inviteUser,
    openManageRolesModal,
    closeManageRolesModal,
    handleSaveRoles,
  }
}

export default useUserList
