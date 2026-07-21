import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormCheck,
  CButton,
  CAlert,
} from '@coreui/react'
import usePermission from '../../../hooks/usePermission'

const schema = yup.object().shape({
  selectedRole: yup.string().required('Role selection is required'),
})

/**
 * ManageRolesModal Component
 * 
 * Form component using react-hook-form to check/uncheck roles for a selected user.
 * Validates with yup schema and enforces read-only state if user lacks permission.
 */
const ManageRolesModal = ({ visible, user, onClose, onSave, availableRoles = [] }) => {
  const hasPermission = usePermission('users', 'update')

  const { reset, watch, setValue, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      selectedRole: '',
    },
  })

  // Reset form values when visible changes or a different user is selected
  useEffect(() => {
    if (visible && user) {
      const userRoles = typeof user.role === 'string'
        ? user.role.split(',').map((r) => r.trim()).filter(Boolean)
        : []
      reset({ selectedRole: userRoles.length > 0 ? userRoles[0] : '' })
    } else if (!visible) {
      reset({ selectedRole: '' })
    }
  }, [user, visible, reset])

  const selectedRole = watch('selectedRole')

  const handleRoleChange = (role) => {
    if (!hasPermission) return
    setValue('selectedRole', role, { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit = (data) => {
    if (!hasPermission) return
    onSave(user.id, [data.selectedRole])
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      id="manage-roles-modal"
      alignment="center"
    >
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem', fontWeight: 700 }}>
          Manage Roles - {user?.name || ''}
        </CModalTitle>
      </CModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
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
              return (
                <CFormCheck
                  key={role}
                  type="radio"
                  name="roleSelection"
                  id={`role-radio-${role.replace(/\s+/g, '-').toLowerCase()}`}
                  label={role}
                  checked={isChecked}
                  disabled={!hasPermission}
                  onChange={() => handleRoleChange(role)}
                />
              )
            })}
          </div>

          {errors.selectedRole && (
            <div className="text-danger small mt-1" id="roles-validation-error">
              {errors.selectedRole.message}
            </div>
          )}
        </CModalBody>
        <CModalFooter className="border-0 pt-0">
          <CButton
            id="close-manage-roles-btn"
            color="light"
            size="sm"
            onClick={onClose}
          >
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
