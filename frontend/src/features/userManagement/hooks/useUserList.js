import { useMemo, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  setSearchQuery,
  toggleRole,
  toggleStatus,
  clearRoleFilter,
  setCurrentPage,
  setRowsPerPage,
  deleteUser,
  addInvitedUser,
  ROLES,
  STATUS_OPTIONS,
} from '../userSlice'

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
  } = useSelector((state) => state.userManagement)

  // Memoized Filtered Rows
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

  // Memoized Paginated Rows
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage))
  }, [filteredUsers.length, rowsPerPage])

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredUsers.slice(start, start + rowsPerPage)
  }, [filteredUsers, currentPage, rowsPerPage])

  // Reset page offset automatically if dataset shrinks below current offset
  useEffect(() => {
    if (currentPage > totalPages) {
      dispatch(setCurrentPage(1))
    }
  }, [totalPages, currentPage, dispatch])

  // Action Dispatchers
  const changeSearchQuery = (query) => dispatch(setSearchQuery(query))
  const changeRoleToggle = (role) => dispatch(toggleRole(role))
  const changeStatusToggle = (status) => dispatch(toggleStatus(status))
  const handleClearRoleFilter = () => dispatch(clearRoleFilter())
  const changePage = (page) => dispatch(setCurrentPage(page))
  const changeRowsPerPage = (rows) => dispatch(setRowsPerPage(rows))
  const removeUser = (id) => dispatch(deleteUser(id))
  const inviteUser = (email) => dispatch(addInvitedUser(email))

  return {
    // State
    searchQuery,
    selectedRoles,
    statusFilter,
    currentPage,
    rowsPerPage,
    totalPages,
    filteredUsers,
    paginatedUsers,
    ROLES,
    STATUS_OPTIONS,

    // Callbacks/Actions
    setSearchQuery: changeSearchQuery,
    toggleRole: changeRoleToggle,
    toggleStatus: changeStatusToggle,
    clearRoleFilter: handleClearRoleFilter,
    setCurrentPage: changePage,
    setRowsPerPage: changeRowsPerPage,
    deleteUser: removeUser,
    inviteUser,
  }
}

export default useUserList
