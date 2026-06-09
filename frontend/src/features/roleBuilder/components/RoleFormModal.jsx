import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
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
import '../styles/_roleBuilder.scss'

const schema = yup.object().shape({
  name: yup.string().trim().required('Role name is required'),
  description: yup.string().trim().optional(),
  permissions: yup.array().of(yup.string().required()).required('Permissions array is required'),
})

/**
 * Formats a raw permission string for user-friendly display next to checkboxes.
 * E.g., 'roles:create' -> 'Create', 'assign_roles' -> 'Assign roles'
 * 
 * @param {string} permissionString 
 * @returns {string} Formatted label
 */
const formatPermissionLabel = (permissionString) => {
  if (!permissionString) return ''
  let label = permissionString
  if (label.includes(':')) {
    const parts = label.split(':')
    label = parts[parts.length - 1]
  }
  label = label.replace(/_/g, ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * RoleFormModal Component
 * 
 * Form modal for creating or editing roles.
 * Displays role details and a visual checkbox grid grouped by permissions category.
 */
const RoleFormModal = ({ visible, role, onClose, onSave }) => {
  const { permissionsList, isPermissionsLoading, loadPermissions } = useRoles()

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  })

  const selectedPermissions = watch('permissions') || []

  // Populates form if editing or clears it on open/close transitions
  useEffect(() => {
    if (visible && role) {
      reset({
        name: role.name || '',
        description: role.description || '',
        permissions: role.permissions || [],
      })
    } else if (!visible) {
      reset({
        name: '',
        description: '',
        permissions: [],
      })
    }
  }, [role, visible, reset])

  // Load available permissions when modal opens and list is empty
  useEffect(() => {
    if (visible && permissionsList.length === 0) {
      loadPermissions()
    }
  }, [visible, permissionsList, loadPermissions])

  // Group permissionsList by feature for visual categorization
  const groupedPermissions = React.useMemo(() => {
    const groups = {}
    permissionsList.forEach((perm) => {
      const feature = perm.feature || 'other'
      const category = feature.charAt(0).toUpperCase() + feature.slice(1)
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(perm)
    })
    return groups
  }, [permissionsList])

  const handleSelectAllGroup = (category, checked) => {
    const groupCodes = groupedPermissions[category].map((perm) => perm.name || perm.code || perm._id)
    let newValue
    if (checked) {
      newValue = Array.from(new Set([...selectedPermissions, ...groupCodes]))
    } else {
      newValue = selectedPermissions.filter((code) => !groupCodes.includes(code))
    }
    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = (data) => {
    onSave(data)
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      id="role-form-modal"
      alignment="center"
      size="lg"
    >
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem', fontWeight: 700 }}>
          {role ? `Edit Role - ${role.name}` : 'Create New Role'}
        </CModalTitle>
      </CModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel htmlFor="role-name-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
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
            <CFormLabel htmlFor="role-desc-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
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

          <div className="mb-2" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Granular Permissions Mapping
          </div>

          <div className="permissions-scroll-container overflow-y-auto pe-2">
            {isPermissionsLoading ? (
              <div className="d-flex justify-content-center align-items-center py-4 my-2">
                <CSpinner color="primary" size="sm" className="me-2" />
                <span className="text-body-secondary small">Loading available permissions...</span>
              </div>
            ) : permissionsList.length === 0 ? (
              <div className="text-center text-body-secondary py-3 small">
                No permissions found in the system.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {Object.keys(groupedPermissions).map((category) => {
                  const groupCodes = groupedPermissions[category].map((perm) => perm.name || perm.code || perm._id)
                  const isAllGroupSelected = groupCodes.length > 0 && groupCodes.every((code) => selectedPermissions.includes(code))
                  return (
                    <div key={category} className="p-3 border rounded bg-light-subtle">
                      <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                        <h6 className="mb-0" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cui-primary, #4f46e5)' }}>
                          {category} Permissions
                        </h6>
                        <CFormCheck
                          id={`select-all-${category}`}
                          label="Select All"
                          checked={isAllGroupSelected}
                          onChange={(e) => handleSelectAllGroup(category, e.target.checked)}
                          className="small fw-semibold text-secondary"
                        />
                      </div>
                      <CRow className="g-2">
                        {groupedPermissions[category].map((perm) => {
                          const permValue = perm.name || perm.code || perm._id
                          const idSafe = String(permValue).replace(':', '-')
                          return (
                            <CCol md={6} key={perm._id || permValue}>
                              <Controller
                                name="permissions"
                                control={control}
                                render={({ field }) => {
                                  const isChecked = Array.isArray(field.value) && field.value.includes(permValue)
                                  return (
                                    <CFormCheck
                                      id={`perm-check-${idSafe}`}
                                      label={formatPermissionLabel(perm.name || String(permValue))}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const newPermissions = e.target.checked
                                          ? [...(field.value || []), permValue]
                                          : (field.value || []).filter((p) => p !== permValue)
                                        field.onChange(newPermissions)
                                      }}
                                    />
                                  )
                                }}
                              />
                            </CCol>
                          )
                        })}
                      </CRow>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {errors.permissions && (
            <div className="text-danger small mt-2" id="role-permissions-error">
              {errors.permissions.message}
            </div>
          )}
        </CModalBody>
        <CModalFooter className="border-0 pt-0">
          <CButton
            id="close-role-form-btn"
            color="light"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </CButton>
          <CButton
            id="save-role-btn"
            type="submit"
            color="primary"
            size="sm"
            style={{ fontWeight: 600 }}
          >
            {role ? 'Save Changes' : 'Create Role'}
          </CButton>
        </CModalFooter>
      </form>
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
