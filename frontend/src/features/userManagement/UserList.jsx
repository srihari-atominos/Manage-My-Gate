/**
 * UserList Component
 *
 * Enterprise user management view. Consumes generic `<PageHeader>` and `<DataTable>`
 * components, and features sub-components `<UserToolbar>` and `<InviteUserModal>`.
 * Exclusively reads data and dispatches actions using the `useUserList` custom hook.
 *
 * Scope: feature-level, lives in src/features/userManagement/
 */

import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { CBadge, CAlert } from '@coreui/react'

// Import generic layout components
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'
import ActionIconButton from '../../components/common/ActionIconButton'

// Import feature sub-components and controller hook
import UserToolbar from './components/UserToolbar'
import InviteUserModal from './components/InviteUserModal'
import InviteUserButton from './components/InviteUserButton'
import ManageRolesModal from './components/ManageRolesModal'
import { useUserList } from './hooks/useUserList'

// ─── Main Component ───────────────────────────────────────────────────────────

const UserList = () => {
  const currentUserId = useSelector((state) => state.auth.user?.id)

  // ── Controller Hook ──
  const {
    searchQuery,
    selectedRoles,
    statusFilter,
    currentPage,
    rowsPerPage,
    totalPages,
    filteredUsers,
    ROLES,
    STATUS_OPTIONS,
    setSearchQuery,
    toggleRole,
    toggleStatus,
    clearRoleFilter,
    setCurrentPage,
    setRowsPerPage,
    deleteUser,
    inviteUser,
    selectedUserForRoles,
    openManageRolesModal,
    closeManageRolesModal,
    handleSaveRoles,
    isLoading,
    error,
  } = useUserList()

  // ── Local UI State ──
  const [showInviteModal, setShowInviteModal] = useState(false)

  // ── Handlers ──

  const handleSendInvite = (emailAddress) => {
    inviteUser(emailAddress)
    setShowInviteModal(false)
  }

  const handleDeleteClick = (user) => {
    if (window.confirm(`Delete user "${user.name}"? This action cannot be undone.`)) {
      deleteUser(user.id)
    }
  }

  const handleManageRoles = (user) => {
    openManageRolesModal(user)
  }

  // ── DataTable Columns Configuration ──
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      render: (val) => <span className="fw-semibold">{val}</span>,
    },
    {
      key: 'email',
      label: 'Email',
      render: (val) => <span className="text-body-secondary">{val}</span>,
    },
    {
      key: 'role',
      label: 'Role',
      render: (val) => {
        if (!val || val === '' || (Array.isArray(val) && val.length === 0)) {
          return (
            <CBadge color="light" className="text-dark small px-2 py-1 border">
              Unassigned
            </CBadge>
          )
        }
        const rolesList = typeof val === 'string' ? val.split(',').map(r => r.trim()) : [val]
        return (
          <div className="d-flex flex-wrap gap-1 overflow-y-auto" style={{ maxHeight: '40px' }}>
            {rolesList.map((r, i) => (
              <CBadge
                key={i}
                color="info"
                shape="rounded-pill"
                className="small px-2 py-1 text-nowrap"
              >
                {r}
              </CBadge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        let badgeColor = 'secondary'
        if (val === 'Active') {
          badgeColor = 'success'
        } else if (val === 'Pending') {
          badgeColor = 'warning'
        }
        return (
          <CBadge
            color={badgeColor}
            className="small px-2 py-1"
          >
            {val}
          </CBadge>
        )
      },
    },
  ], [])

  // ── Render Actions for Data Grid ──
  const renderRowActions = (user) => {
    const isSelf = user.id === currentUserId
    return (
      <div className="d-flex gap-2">
        {/* Manage Roles — key icon */}
        <ActionIconButton
          id={`manage-roles-${user.id}`}
          color="primary"
          onClick={() => handleManageRoles(user)}
          title={isSelf ? 'You cannot modify your own account.' : `Manage roles for ${user.name}`}
          disabled={isSelf}
          icon={
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          }
        />
        {/* Delete — trash icon */}
        <ActionIconButton
          id={`delete-user-${user.id}`}
          color="danger"
          onClick={() => handleDeleteClick(user)}
          title={isSelf ? 'You cannot modify your own account.' : `Delete ${user.name}`}
          disabled={isSelf}
          icon={
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          }
        />
      </div>
    )
  }

  // ── Responsive Toolbar Wrapper ──
  const toolbar = (
    <UserToolbar
      search={searchQuery}
      setSearch={setSearchQuery}
      selectedRoles={selectedRoles}
      handleRoleToggle={toggleRole}
      setSelectedRoles={clearRoleFilter}
      statusFilter={statusFilter}
      handleStatusToggle={toggleStatus}
      ROLES={ROLES}
      STATUS_OPTIONS={STATUS_OPTIONS}
    />
  )

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <PageHeader
        title="User Management"
        subtitle="Manage organization users and allocate access roles."
        actionButtons={<InviteUserButton onClick={() => setShowInviteModal(true)} />}
      />

      {error && (
        <CAlert color="danger" className="mb-3" id="user-list-error-alert">
          {error}
        </CAlert>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        toolbar={toolbar}
        renderRowActions={renderRowActions}
        currentPage={currentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
        loading={isLoading}
      />

      {/* Invite User Modal */}
      <InviteUserModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSendInvite={handleSendInvite}
      />

      {/* Manage Roles Modal */}
      <ManageRolesModal
        visible={!!selectedUserForRoles}
        user={selectedUserForRoles}
        onClose={closeManageRolesModal}
        onSave={handleSaveRoles}
        availableRoles={ROLES}
      />
    </div>
  )
}

export default UserList
