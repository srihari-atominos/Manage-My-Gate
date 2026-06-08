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
import { CBadge } from '@coreui/react'

// Import generic layout components
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'
import ActionIconButton from '../../components/common/ActionIconButton'

// Import feature sub-components and controller hook
import UserToolbar from './components/UserToolbar'
import InviteUserModal from './components/InviteUserModal'
import InviteUserButton from './components/InviteUserButton'
import { useUserList } from './hooks/useUserList'

// ─── Main Component ───────────────────────────────────────────────────────────

const UserList = () => {
  // ── Controller Hook ──
  const {
    searchQuery,
    selectedRoles,
    statusFilter,
    currentPage,
    rowsPerPage,
    totalPages,
    paginatedUsers,
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
    console.log(`Manage roles for: ${user.name}`)
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
      render: (val) => (
        <CBadge
          color={val === 'Active' ? 'success' : 'secondary'}
          className="small px-2 py-1"
        >
          {val}
        </CBadge>
      ),
    },
  ], [])

  // ── Render Actions for Data Grid ──
  const renderRowActions = (user) => (
    <div className="d-flex gap-2">
      {/* Manage Roles — key icon */}
      <ActionIconButton
        id={`manage-roles-${user.id}`}
        color="primary"
        onClick={() => handleManageRoles(user)}
        title={`Manage roles for ${user.name}`}
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
        title={`Delete ${user.name}`}
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={paginatedUsers}
        toolbar={toolbar}
        renderRowActions={renderRowActions}
        currentPage={currentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* Invite User Modal */}
      <InviteUserModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSendInvite={handleSendInvite}
      />
    </div>
  )
}

export default UserList
