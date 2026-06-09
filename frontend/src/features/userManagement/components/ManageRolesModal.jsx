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
import usePermissions from '../../../hooks/usePermissions'

const schema = yup.object().shape({
  selectedRoles: yup.array().of(yup.string().required()).required('Roles selection is required'),
})

/**
 * ManageRolesModal Component
 * 
 * Form component using react-hook-form to check/uncheck roles for a selected user.
 * Validates with yup schema and enforces read-only state if user lacks permission.
 */
const ManageRolesModal = ({ visible, user, onClose, onSave, availableRoles = [] }) => {
  const hasPermission = usePermissions('assign_roles')

  const { reset, watch, setValue, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      selectedRoles: [],
    },
  })

  // Reset form values when visible changes or a different user is selected
  useEffect(() => {
    if (visible && user) {
      const userRoles = typeof user.role === 'string'
        ? user.role.split(',').map((r) => r.trim()).filter(Boolean)
        : []
      reset({ selectedRoles: userRoles })
    } else if (!visible) {
      reset({ selectedRoles: [] })
    }
  }, [user, visible, reset])

  const selectedRoles = watch('selectedRoles') || []

  const handleCheckboxChange = (role, checked) => {
    if (!hasPermission) return
    let newRoles
    if (checked) {
      newRoles = [...selectedRoles, role]
    } else {
      newRoles = selectedRoles.filter((r) => r !== role)
    }
    setValue('selectedRoles', newRoles, { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit = (data) => {
    if (!hasPermission) return
    onSave(user.id, data.selectedRoles)
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
              const isChecked = selectedRoles.includes(role)
              return (
                <CFormCheck
                  key={role}
                  id={`role-checkbox-${role.replace(/\s+/g, '-').toLowerCase()}`}
                  label={role}
                  checked={isChecked}
                  disabled={!hasPermission}
                  onChange={(e) => handleCheckboxChange(role, e.target.checked)}
                />
              )
            })}
          </div>

          {errors.selectedRoles && (
            <div className="text-danger small mt-1" id="roles-validation-error">
              {errors.selectedRoles.message}
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
