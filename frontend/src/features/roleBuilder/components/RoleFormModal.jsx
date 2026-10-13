import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormCheck,
  CButton,
  CRow,
  CCol,
  CSpinner,
} from '@coreui/react'
import useRoles from '../hooks/useRoles'
import useRoleForm from '../hooks/useRoleForm'
import RoleIntegrationConfigurator from './RoleIntegrationConfigurator'
import PermissionMatrix from './PermissionMatrix'
import '../styles/_roleBuilder.scss'

/**
 * RoleFormModal Component
 *
 * Form modal for creating or editing roles.
 * Displays role details and a visual checkbox grid grouped by permissions category.
 */
const RoleFormModal = ({ visible, role, onClose, onSave }) => {
  const { permissionsList, isPermissionsLoading, loadPermissions } = useRoles()
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false)

  const {
    register,
    handleSubmit,
    errors,
    selectedPermissions,
    isTenantRole,
    roleScope,
    integrationMappings,
    activeMappingsCount,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission,
  } = useRoleForm({ role, visible, onSave })

  const handleSelectScope = (scope) => {
    setValue('roleScope', scope, { shouldValidate: true, shouldDirty: true })
    setValue('isTenantRole', scope === 'UNIT' || scope === 'STAFF', { shouldValidate: true, shouldDirty: true })
  }

  // Load available permissions when modal opens
  useEffect(() => {
    if (visible) {
      loadPermissions()
    }
  }, [visible, loadPermissions])

  return (
    <CModal visible={visible} onClose={onClose} id="role-form-modal" alignment="center" size="lg">
      <CModalHeader>
        <CModalTitle className="modal-title-custom">
          {role ? `Edit Role - ${role.name}` : 'Create New Role'}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <form id="role-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <CFormLabel htmlFor="role-name-input" className="form-label-custom">
              Role Name
            </CFormLabel>
            <CFormInput
              id="role-name-input"
              type="text"
              placeholder="e.g., Branch Manager"
              {...register('name')}
              invalid={!!errors.name}
            />
            {errors.name && (
              <div className="text-danger small mt-1" id="role-name-error">
                {errors.name.message}
              </div>
            )}
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="role-desc-input" className="form-label-custom">
              Description
            </CFormLabel>
            <CFormTextarea
              id="role-desc-input"
              placeholder="Enter role description..."
              rows={3}
              {...register('description')}
              invalid={!!errors.description}
            />
            {errors.description && (
              <div className="text-danger small mt-1" id="role-desc-error">
                {errors.description.message}
              </div>
            )}
          </div>

          {/* Scope Archetype Selection */}
          <div className="mb-3">
            <CFormLabel className="form-label-custom">Role Scope & Tenancy Archetype</CFormLabel>
            <div className="row g-2">
              <div className="col-12 col-md-4">
                <div
                  className={`p-3 border rounded h-100 cursor-pointer ${
                    roleScope === 'GLOBAL' ? 'border-primary bg-primary-subtle' : 'bg-body-tertiary'
                  }`}
                  onClick={() => handleSelectScope('GLOBAL')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="fw-bold small text-primary">Global Scope</span>
                    <input
                      type="radio"
                      name="roleScopeOption"
                      checked={roleScope === 'GLOBAL'}
                      onChange={() => handleSelectScope('GLOBAL')}
                    />
                  </div>
                  <div className="text-body-secondary small" style={{ fontSize: '0.75rem' }}>
                    Community-wide facility & management access. Unrestricted to a single unit.
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div
                  className={`p-3 border rounded h-100 cursor-pointer ${
                    roleScope === 'UNIT' ? 'border-success bg-success-subtle' : 'bg-body-tertiary'
                  }`}
                  onClick={() => handleSelectScope('UNIT')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="fw-bold small text-success">Unit Scope</span>
                    <input
                      type="radio"
                      name="roleScopeOption"
                      checked={roleScope === 'UNIT'}
                      onChange={() => handleSelectScope('UNIT')}
                    />
                  </div>
                  <div className="text-body-secondary small" style={{ fontSize: '0.75rem' }}>
                    Bound to specific villas/apartments when onboarding residents.
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div
                  className={`p-3 border rounded h-100 cursor-pointer ${
                    roleScope === 'STAFF' ? 'border-warning bg-warning-subtle' : 'bg-body-tertiary'
                  }`}
                  onClick={() => handleSelectScope('STAFF')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="fw-bold small text-warning-emphasis">Staff Member</span>
                    <input
                      type="radio"
                      name="roleScopeOption"
                      checked={roleScope === 'STAFF'}
                      onChange={() => handleSelectScope('STAFF')}
                    />
                  </div>
                  <div className="text-body-secondary small" style={{ fontSize: '0.75rem' }}>
                    Dual scope: acts in community & can link to units. Auto-syncs to Staff Management.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Integration Configuration Segment */}
          <div className="mb-3">
            <CFormLabel className="form-label-custom">Role Integrations</CFormLabel>
            <div className="d-flex align-items-center gap-3 p-2 border rounded bg-body-secondary-subtle">
              <CButton
                type="button"
                color="info"
                variant="outline"
                size="sm"
                className="fw-semibold"
                onClick={() => setIsConfiguratorOpen(!isConfiguratorOpen)}
              >
                {isConfiguratorOpen ? 'Hide Configurator' : '🔗 Configure Integrations'}
              </CButton>
              <span className="small text-body-secondary">
                {activeMappingsCount > 0
                  ? `Mapped: ${activeMappingsCount} active provider${activeMappingsCount > 1 ? 's' : ''}`
                  : 'No mapped integrations.'}
              </span>
            </div>

            <RoleIntegrationConfigurator
              isOpen={isConfiguratorOpen}
              onClose={() => setIsConfiguratorOpen(false)}
              mappings={integrationMappings}
              onApply={(newMappings) => {
                setValue('integrationMappings', newMappings, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
          </div>

          <div className="form-label-custom mb-2">Granular Permissions Mapping</div>

          <div className="permissions-scroll-container pe-2">
            {isPermissionsLoading ? (
              <div className="d-flex justify-content-center align-items-center py-4 my-2">
                <CSpinner color="primary" size="sm" className="me-2" />
                <span className="text-body-secondary small">Loading available permissions...</span>
              </div>
            ) : (
              <PermissionMatrix
                groupedPermissions={permissionsList}
                selectedIds={selectedPermissions}
                onSelectAllGroup={handleSelectAllGroup}
                onTogglePermission={handleTogglePermission}
              />
            )}
          </div>

          {errors.permissions && (
            <div className="text-danger small mt-2" id="role-permissions-error">
              {errors.permissions.message}
            </div>
          )}
        </form>
      </CModalBody>
      <CModalFooter className="border-0 pt-0">
        <CButton id="close-role-form-btn" color="light" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          id="save-role-btn"
          type="submit"
          form="role-form"
          color="primary"
          size="sm"
          className="fw-semibold"
        >
          {role ? 'Save Changes' : 'Create Role'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

RoleFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  role: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default RoleFormModal
