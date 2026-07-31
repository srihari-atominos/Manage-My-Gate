import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAlert,
} from '@coreui/react'
import usePermission from '../../../hooks/usePermission'

/**
 * ManageRolesModal Component
 *
 * Simple state-based modal to check/uncheck roles for a selected user.
 * Enforces read-only state if user lacks permission.
 */
const ManageRolesModal = ({ visible, user, unit, onClose, onSave, availableRoles = [] }) => {
  const hasPermission = usePermission('users', 'update')
  const [selectedRole, setSelectedRole] = useState('')
  const [error, setError] = useState('')

  // Reset form values when visible changes or a different user is selected
  useEffect(() => {
    if (visible && user) {
      const sourceRole = unit ? unit.role : user.role
      const userRoles = Array.isArray(sourceRole)
        ? sourceRole
        : typeof sourceRole === 'string'
          ? sourceRole
              .split(',')
              .map((r) => r.trim())
              .filter(Boolean)
          : []
      setSelectedRole(userRoles.length > 0 ? userRoles[0] : '')
      setError('')
    } else if (!visible) {
      setSelectedRole('')
      setError('')
    }
  }, [user, unit, visible])

  const handleRoleChange = (role) => {
    if (!hasPermission) return
    setError('')
    if (selectedRole === role) {
      setSelectedRole('') // Toggle off
    } else {
      setSelectedRole(role) // Select new role
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!hasPermission) return
    // Allow empty role (Unassigned)
    onSave(user.id, selectedRole ? [selectedRole] : [])
  }

  return (
    <CModal visible={visible} onClose={onClose} id="manage-roles-modal" alignment="center">
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem', fontWeight: 700 }}>
          Manage Roles - {user?.name || ''} {unit ? `(Unit ${unit.villaNumber})` : ''}
        </CModalTitle>
      </CModalHeader>
      <form onSubmit={onSubmit}>
        <CModalBody>
          {!hasPermission && (
            <CAlert color="warning" className="mb-3" id="rbac-warning-alert">
              You do not have permission to modify roles.
            </CAlert>
          )}

          <div className="mb-2" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Select user roles:
          </div>

          <div className="d-flex flex-column gap-2 mb-3">
            {availableRoles.map((role) => {
              const isChecked = selectedRole === role
              const safeId = `role-radio-${role.replace(/\s+/g, '-').toLowerCase()}`
              return (
                <div
                  key={role}
                  className="form-check p-2 rounded"
                  style={{
                    transition: 'background-color 0.2s',
                    backgroundColor: isChecked ? '#f3f4f6' : 'transparent',
                  }}
                >
                  <input
                    className="form-check-input mt-1"
                    type="checkbox"
                    name="roleSelection"
                    id={safeId}
                    checked={isChecked}
                    disabled={!hasPermission}
                    onChange={() => {
                      if (hasPermission) handleRoleChange(role)
                    }}
                    style={{ cursor: hasPermission ? 'pointer' : 'default', marginLeft: '-1.5em' }}
                  />
                  <label
                    className="form-check-label ms-2 d-block w-100"
                    htmlFor={safeId}
                    style={{
                      cursor: hasPermission ? 'pointer' : 'default',
                      userSelect: 'none',
                      opacity: !hasPermission ? 0.6 : 1,
                      fontWeight: isChecked ? 600 : 400,
                    }}
                  >
                    {role}
                  </label>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="text-danger small mt-1" id="roles-validation-error">
              {error}
            </div>
          )}
        </CModalBody>
        <CModalFooter className="border-0 pt-0">
          <CButton id="close-manage-roles-btn" color="light" size="sm" onClick={onClose}>
            Cancel
          </CButton>
          {hasPermission && (
            <CButton
              id="save-roles-btn"
              type="submit"
              color="primary"
              size="sm"
              style={{ fontWeight: 600 }}
            >
              Save Changes
            </CButton>
          )}
        </CModalFooter>
      </form>
    </CModal>
  )
}

ManageRolesModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  user: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  availableRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
}

export default ManageRolesModal
