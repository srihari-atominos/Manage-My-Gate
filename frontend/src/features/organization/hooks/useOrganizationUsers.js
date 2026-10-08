import { useDispatch, useSelector } from 'react-redux'
import {
  loadOrganizationUsers,
  loadOrganizationUserDetails,
  setUserSearch,
  setUserRoleFilter,
  setUserStatusFilter,
  closeUserDrawer,
  bulkInviteOrganizationUsersAsync,
} from '../store/organizationSlice.js'

/**
 * Controller hook for managing organization user directory, search, filter, pagination, and user drawer.
 */
export const useOrganizationUsers = (orgId) => {
  const dispatch = useDispatch()

  const usersState = useSelector((state) => state.organization.users)

  const fetchUsers = (pageNumber = 1, overrideParams = {}) => {
    if (!orgId) return
    const params = {
      page: pageNumber,
      limit: usersState.limit,
      search: overrideParams.search !== undefined ? overrideParams.search : usersState.search,
      role: overrideParams.role !== undefined ? overrideParams.role : usersState.roleFilter,
      status: overrideParams.status !== undefined ? overrideParams.status : usersState.statusFilter,
    }
    dispatch(loadOrganizationUsers({ orgId, ...params }))
  }

  const handleSearch = (searchQuery) => {
    dispatch(setUserSearch(searchQuery))
    fetchUsers(1, { search: searchQuery })
  }

  const handleRoleFilter = (role) => {
    dispatch(setUserRoleFilter(role))
    fetchUsers(1, { role })
  }

  const handleStatusFilter = (status) => {
    dispatch(setUserStatusFilter(status))
    fetchUsers(1, { status })
  }

  const handleViewUser = (userId) => {
    if (orgId && userId) {
      dispatch(loadOrganizationUserDetails({ orgId, userId }))
    }
  }

  const handleCloseDrawer = () => {
    dispatch(closeUserDrawer())
  }

  const bulkInviteUsers = async (data) => {
    const resultAction = await dispatch(
      bulkInviteOrganizationUsersAsync({ orgId, invitations: data }),
    )
    if (bulkInviteOrganizationUsersAsync.fulfilled.match(resultAction)) {
      fetchUsers(1)
      return resultAction.payload
    } else {
      throw resultAction.payload || resultAction.error?.message || 'Failed to bulk invite users'
    }
  }

  return {
    users: usersState.list,
    total: usersState.total,
    page: usersState.page,
    limit: usersState.limit,
    totalPages: usersState.totalPages,
    search: usersState.search,
    roleFilter: usersState.roleFilter,
    statusFilter: usersState.statusFilter,
    loading: usersState.loading,
    error: usersState.error,
    selectedUser: usersState.selectedUser,
    userDrawerOpen: usersState.userDrawerOpen,
    userDrawerLoading: usersState.userDrawerLoading,
    fetchUsers,
    handleSearch,
    handleRoleFilter,
    handleStatusFilter,
    handleViewUser,
    handleCloseDrawer,
    bulkInviteUsers,
  }
}

export default useOrganizationUsers
