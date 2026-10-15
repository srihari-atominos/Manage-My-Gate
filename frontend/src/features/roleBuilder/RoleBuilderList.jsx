import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { CBadge, CAlert, CButton } from '@coreui/react'
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'
import ActionIconButton from '../../components/common/ActionIconButton'
import useRoles from './hooks/useRoles'
import RoleFormModal from './components/RoleFormModal'
import { getRoleScopeOption } from './roleScopes'
import './styles/_roleBuilder.scss'

/**
 * RoleBuilderList Component
 *
 * Enterprise role builder list view. Consumes generic PageHeader and DataTable.
 * Allows creating, editing, and deleting system roles with granular permission mappings.
 */
const RoleBuilderList = () => {
  const {
    roles,
    isLoading,
    error,
    isModalOpen,
    selectedRoleForEdit,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSaveRole,
    handleDeleteRole,
    currentPage,
    totalPages,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange,
  } = useRoles()

  const isPlatform = useSelector((state) => state.workspace?.isPlatform === true)

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Role Name',
        render: (val) => <span className="fw-semibold">{val}</span>,
      },
      {
        key: 'isTenantRole',
        label: 'Scope',
        render: (val, role) => {
          const scope =
            role?.roleScope ||
            (/staff|guard|technician|vendor|maid|driver|cook|gardener/i.test(role?.name || '')
              ? 'STAFF'
              : val
                ? 'UNIT'
                : 'GLOBAL')
          const option = getRoleScopeOption(scope) || getRoleScopeOption('GLOBAL')
          return (
            <CBadge
              color={option.color}
              shape="rounded-pill"
              className={`px-2 py-1 ${option.color === 'warning' ? 'text-dark' : 'text-white'}`}
            >
              {option.badge}
            </CBadge>
          )
        },
      },
      {
        key: 'description',
        label: 'Description',
        render: (val) => (
          <span className="text-body-secondary">{val || 'No description provided.'}</span>
        ),
      },
      {
        key: 'permissions',
        label: 'Permissions Count',
        render: (val) => {
          const count = Array.isArray(val) ? val.length : 0
          return (
            <CBadge
              color={count > 0 ? 'success' : 'secondary'}
              shape="rounded-pill"
              className="px-2 py-1"
            >
              {count} {count === 1 ? 'permission' : 'permissions'} granted
            </CBadge>
          )
        },
      },
      {
        key: 'memberCount',
        label: 'Members',
        render: (val, role) => (
          <span className="d-inline-flex align-items-center gap-2">
            <span className="text-body-secondary">
              {val ?? 0} {(val ?? 0) === 1 ? 'member' : 'members'}
            </span>
            {role?.isShared ? (
              <CBadge color="secondary" shape="rounded-pill" className="px-2 py-1">
                Shared
              </CBadge>
            ) : null}
          </span>
        ),
      },
    ],
    [],
  )

  const renderRowActions = (role) => {
    const isSuperAdmin = role.name === 'Super Admin' || role.name === 'Platform Super Admin'
    const memberCount = role.memberCount ?? 0
    // Shared roles belong to the platform; a community can only view them.
    const readOnlyShared = Boolean(role.isShared) && !isPlatform
    const editBlockedReason = isSuperAdmin
      ? 'System roles cannot be modified.'
      : readOnlyShared
        ? 'Shared roles can only be changed by platform administrators.'
        : null
    const deleteBlockedReason =
      editBlockedReason ||
      (role.isLocked
        ? `"${role.name}" is a built-in role the community needs, so it cannot be deleted.`
        : memberCount > 0
          ? `Assigned to ${memberCount} active ${memberCount === 1 ? 'member' : 'members'}. Assign them a different role first.`
          : null)
    return (
      <div className="d-flex gap-2">
        {/* Edit button */}
        <ActionIconButton
          id={`edit-role-${role.id}`}
          color="info"
          onClick={() => openEditModal(role)}
          title={editBlockedReason || `Edit ${role.name}`}
          disabled={Boolean(editBlockedReason)}
          icon={
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-9 2L22 3m0 0l-3-3m3 3L19 6" />
            </svg>
          }
        />
        {/* Delete button */}
        <ActionIconButton
          id={`delete-role-${role.id}`}
          color="danger"
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
              handleDeleteRole(role.id)
            }
          }}
          title={deleteBlockedReason || `Delete ${role.name}`}
          disabled={Boolean(deleteBlockedReason)}
          icon={
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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

  const headerActions = (
    <CButton
      id="create-role-btn"
      color="primary"
      size="sm"
      className="d-flex align-items-center gap-2 fw-semibold"
      onClick={openCreateModal}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Create Role
    </CButton>
  )

  return (
    <div className="p-4 role-builder-container">
      <PageHeader
        title="Role Management"
        subtitle="Configure system access roles and map resource permissions."
        actionButtons={headerActions}
      />

      {error && (
        <CAlert color="danger" className="mb-3" id="role-list-error-alert">
          {error}
        </CAlert>
      )}

      <DataTable
        columns={columns}
        data={roles}
        renderRowActions={renderRowActions}
        loading={isLoading}
        totalPages={totalPages}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      <RoleFormModal
        visible={isModalOpen}
        role={selectedRoleForEdit}
        onClose={closeModal}
        onSave={handleSaveRole}
      />
    </div>
  )
}

export default RoleBuilderList
