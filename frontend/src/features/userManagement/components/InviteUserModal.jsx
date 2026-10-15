import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
  CAlert,
  CSpinner,
} from '@coreui/react'
import apiClient from '../../../services/apiClient'
import { validateEmail, parseBackendError } from '../../../utils/validation'
import { getRoleScopeOption } from '../../roleBuilder/roleScopes'

/**
 * InviteUserModal Component
 *
 * Renders modal overlay containing form inputs for inviting new community users.
 */
const InviteUserModal = ({ visible, onClose, onSendInvite }) => {
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [villas, setVillas] = useState([])
  const [selectedVillaId, setSelectedVillaId] = useState('')
  const [roles, setRoles] = useState([])
  const [selectedRoleName, setSelectedRoleName] = useState('')
  const [roleTouched, setRoleTouched] = useState(false)
  const [loadingVillas, setLoadingVillas] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [department, setDepartment] = useState('Others')
  const [staffType, setStaffType] = useState('In-House Staff')
  const [designation, setDesignation] = useState('')
  const [staffCode, setStaffCode] = useState('')

  const isStaffRole = (roleName) => {
    if (!roleName) return false
    const lower = roleName.toLowerCase()
    return (
      lower.includes('staff') ||
      lower.includes('vendor') ||
      lower.includes('technician') ||
      lower.includes('maintenance') ||
      lower.includes('maid') ||
      lower.includes('driver') ||
      lower.includes('cook') ||
      lower.includes('gardener') ||
      lower.includes('electrician') ||
      lower.includes('plumber') ||
      lower.includes('carpenter') ||
      lower.includes('cleaner') ||
      lower.includes('housekeeping')
    )
  }

  const selectedRoleObj = roles.find((r) => r.name === selectedRoleName)
  const isTenantRole = selectedRoleObj ? selectedRoleObj.isTenantRole : false
  // Community Staff (Global Staff) work community-wide, so they are never tied to a unit at invite time.
  const isCommunityStaffRole = selectedRoleObj?.roleScope === 'COMMUNITY_STAFF'
  const isStaff =
    isStaffRole(selectedRoleName) || selectedRoleObj?.roleScope === 'STAFF' || isCommunityStaffRole

  useEffect(() => {
    if (visible) {
      setSubmitError(null)
      setLoadingVillas(true)
      apiClient
        .get('/villas?limit=1000')
        .then((res) => {
          setVillas(res.data?.data || [])
        })
        .catch((err) => {
          console.error('Failed to load villas for invite dropdown:', err)
        })
        .finally(() => {
          setLoadingVillas(false)
        })

      setLoadingRoles(true)
      apiClient
        .get('/roles?limit=100')
        .then((res) => {
          setRoles(res.data?.data || [])
        })
        .catch((err) => {
          console.error('Failed to load roles for invite dropdown:', err)
        })
        .finally(() => {
          setLoadingRoles(false)
        })
    }
  }, [visible])

  const emailValidation = validateEmail(inviteEmail)
  // Phone is mandatory for every invitation; the server normalises the format
  const phoneIsValid = /^\+?[0-9\s-]{8,16}$/.test(invitePhone.trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEmailTouched(true)
    setRoleTouched(true)
    setPhoneTouched(true)
    setSubmitError(null)

    if (
      emailValidation.state === 'empty' ||
      emailValidation.state === 'incomplete' ||
      emailValidation.state === 'invalid'
    ) {
      return
    }

    if (!phoneIsValid) return
    if (!selectedRoleName) return

    // Villa is mandatory for tenant residents, but optional for staff
    if (isTenantRole && !isStaff && !selectedVillaId) return

    // Determine residentType based on roleName
    let residentType = 'None'
    if (isStaff) {
      residentType = selectedVillaId && !isCommunityStaffRole ? 'Household Staff' : 'Community Staff'
    } else if (isTenantRole && selectedRoleName) {
      const lowerName = selectedRoleName.toLowerCase()
      if (lowerName.includes('owner')) residentType = 'Owner'
      else if (lowerName.includes('tenant')) residentType = 'Tenant'
      else if (lowerName.includes('family')) residentType = 'Family'
      else residentType = 'Guest' // Fallback for other tenant roles
    }

    setSubmitting(true)
    try {
      const payload = {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        phone: invitePhone.trim(),
        villaId: (!isCommunityStaffRole && selectedVillaId) || null,
        residentType,
        roleName: selectedRoleName || null,
      }

      if (isStaff) {
        payload.staffData = {
          isStaff: true,
          department,
          staffType,
          designation: designation.trim() || selectedRoleName,
          staffCode: staffCode.trim() || undefined,
        }
      }

      await onSendInvite(payload)
      handleClose()
    } catch (err) {
      setSubmitError(
        parseBackendError(err, 'Failed to send invitation. Please verify the email and try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setInviteName('')
    setInviteEmail('')
    setEmailTouched(false)
    setInvitePhone('')
    setPhoneTouched(false)
    setSelectedVillaId('')
    setSelectedRoleName('')
    setRoleTouched(false)
    setDepartment('Others')
    setStaffType('In-House Staff')
    setDesignation('')
    setStaffCode('')
    setSubmitError(null)
    onClose()
  }

  return (
    <CModal visible={visible} onClose={handleClose} id="invite-user-modal" alignment="center">
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem', fontWeight: 700 }}>
          Invite Resident / Community Staff
        </CModalTitle>
      </CModalHeader>
      <form onSubmit={handleSubmit}>
        <CModalBody>
          {submitError && (
            <CAlert
              color="danger"
              className="mb-3"
              dismissible
              onDismiss={() => setSubmitError(null)}
            >
              {submitError}
            </CAlert>
          )}

          <div className="mb-3">
            <CFormLabel
              htmlFor="invite-name-input"
              style={{ fontSize: '0.85rem', fontWeight: 600 }}
            >
              Full Name
            </CFormLabel>
            <CFormInput
              id="invite-name-input"
              type="text"
              placeholder="e.g. John Doe"
              value={inviteName}
              onChange={(e) => {
                setInviteName(e.target.value)
                if (submitError) setSubmitError(null)
              }}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="mb-3">
            <CFormLabel
              htmlFor="invite-email-input"
              style={{ fontSize: '0.85rem', fontWeight: 600 }}
            >
              Email Address <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              id="invite-email-input"
              type="email"
              placeholder="resident@example.com"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value)
                if (submitError) setSubmitError(null)
              }}
              onBlur={() => setEmailTouched(true)}
              valid={emailTouched && emailValidation.state === 'valid'}
              invalid={
                emailTouched &&
                (emailValidation.state === 'invalid' ||
                  (emailValidation.state === 'empty' && emailTouched))
              }
              feedbackValid="Valid email address format"
              feedbackInvalid={
                emailValidation.state === 'empty'
                  ? 'Email address is required'
                  : emailValidation.message
              }
              text={
                emailTouched && emailValidation.state === 'incomplete'
                  ? 'Keep typing... (e.g. resident@example.com)'
                  : undefined
              }
              required
              disabled={submitting}
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="invite-phone-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Phone Number <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              id="invite-phone-input"
              type="tel"
              placeholder="+91 98765 43210"
              value={invitePhone}
              onChange={(e) => {
                setInvitePhone(e.target.value)
                if (submitError) setSubmitError(null)
              }}
              onBlur={() => setPhoneTouched(true)}
              invalid={phoneTouched && !phoneIsValid}
              feedbackInvalid="Enter a valid phone number, including the country code"
              required
              disabled={submitting}
            />
          </div>

          <div className="mb-3">
            <CFormLabel
              htmlFor="invite-role-select"
              style={{ fontSize: '0.85rem', fontWeight: 600 }}
            >
              Select Role <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect
              id="invite-role-select"
              value={selectedRoleName}
              onChange={(e) => {
                setSelectedRoleName(e.target.value)
                setRoleTouched(true)
              }}
              onBlur={() => setRoleTouched(true)}
              invalid={roleTouched && !selectedRoleName}
              feedbackInvalid="Please choose a community role"
              className="form-select-sm"
              required
              disabled={loadingRoles || submitting}
            >
              <option value="">-- Choose a Role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name} (
                  {getRoleScopeOption(role.roleScope)?.label || (role.isTenantRole ? 'Tenant/Unit' : 'Global')})
                </option>
              ))}
            </CFormSelect>
          </div>

          {isStaff && (
            <div className="p-3 mb-3 border rounded bg-light">
              <div className="fw-bold mb-2 text-primary" style={{ fontSize: '0.85rem' }}>
                Staff & Facility Specifications
              </div>
              <div className="row g-2">
                <div className="col-md-6 mb-2">
                  <CFormLabel htmlFor="staff-dept-select" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Department / Trade
                  </CFormLabel>
                  <CFormSelect
                    id="staff-dept-select"
                    size="sm"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Security">Security</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Others">Others</option>
                  </CFormSelect>
                </div>
                <div className="col-md-6 mb-2">
                  <CFormLabel htmlFor="staff-type-select" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Employment Type
                  </CFormLabel>
                  <CFormSelect
                    id="staff-type-select"
                    size="sm"
                    value={staffType}
                    onChange={(e) => setStaffType(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="In-House Staff">In-House Staff</option>
                    <option value="External Vendor">External Vendor</option>
                  </CFormSelect>
                </div>
                <div className="col-12 mb-1">
                  <CFormLabel htmlFor="staff-designation-input" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Designation / Title (e.g. Electrician, Private Maid, Driver)
                  </CFormLabel>
                  <CFormInput
                    id="staff-designation-input"
                    size="sm"
                    placeholder="e.g. Senior Electrician, Private Maid"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          )}

          {(isTenantRole || isStaff) && !isCommunityStaffRole && (
            <div className="mb-3 position-relative">
              <CFormLabel
                htmlFor="invite-villa-select"
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
              >
                {isStaff ? 'Associated Villa / Unit (Optional for Community Staff)' : 'Select Villa / Unit'}{' '}
                {!isStaff && <span className="text-danger">*</span>}
              </CFormLabel>
              <div className={`dropdown w-100 ${!isStaff && roleTouched && !selectedVillaId ? 'is-invalid border border-danger rounded' : ''}`}>
                <button
                  className="btn btn-outline-secondary w-100 text-start d-flex justify-content-between align-items-center form-select-sm bg-white"
                  type="button"
                  data-coreui-toggle="dropdown"
                  aria-expanded="false"
                  disabled={loadingVillas}
                  onClick={(e) => {
                    const menu = e.currentTarget.nextElementSibling
                    if (menu.classList.contains('show')) {
                      menu.classList.remove('show')
                    } else {
                      menu.classList.add('show')
                    }
                  }}
                >
                  {selectedVillaId
                    ? (() => {
                        const v = villas.find((v) => v._id === selectedVillaId)
                        return v
                          ? `${v.unitNumber} ${v.blockOrBuilding ? `(${v.blockOrBuilding})` : ''}`
                          : (isStaff ? '-- None (Community-wide Staff) --' : '-- Choose a Villa --')
                      })()
                    : (isStaff ? '-- None (Community-wide Staff) --' : '-- Choose a Villa --')}
                  <span className="caret"></span>
                </button>
                <ul
                  className="dropdown-menu w-100 shadow-sm"
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    position: 'absolute',
                    zIndex: 9999,
                  }}
                >
                  <li>
                    <button
                      className="dropdown-item"
                      type="button"
                      onClick={(e) => {
                        setSelectedVillaId('')
                        e.currentTarget.closest('.dropdown-menu').classList.remove('show')
                      }}
                    >
                      {isStaff ? '-- None (Community-wide Staff) --' : '-- Choose a Villa --'}
                    </button>
                  </li>
                  {villas.map((villa) => (
                    <li key={villa._id}>
                      <button
                        className="dropdown-item"
                        type="button"
                        onClick={(e) => {
                          setSelectedVillaId(villa._id)
                          e.currentTarget.closest('.dropdown-menu').classList.remove('show')
                        }}
                      >
                        {villa.unitNumber}{' '}
                        {villa.blockOrBuilding ? `(${villa.blockOrBuilding})` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {isStaff ? (
                <div className="text-muted mt-1" style={{ fontSize: '0.78rem' }}>
                  Select a unit for dedicated household staff (e.g. Private Maid/Driver), or leave blank for community-wide facility staff.
                </div>
              ) : (
                roleTouched && !selectedVillaId && (
                  <div className="invalid-feedback d-block" style={{ fontSize: '0.875em' }}>
                    Please choose a villa or unit
                  </div>
                )
              )}
            </div>
          )}

          <div className="mt-2" style={{ fontSize: '0.78rem', color: 'var(--cui-text-muted)' }}>
            An invitation email will be sent with a link to setup credentials.
          </div>
        </CModalBody>
        <CModalFooter className="border-0 pt-0">
          <CButton color="light" size="sm" onClick={handleClose} disabled={submitting}>
            Cancel
          </CButton>
          <CButton
            id="send-invitation-btn"
            type="submit"
            color="primary"
            size="sm"
            disabled={
              submitting ||
              !inviteEmail.trim() ||
              emailValidation.state === 'invalid' ||
              emailValidation.state === 'incomplete' ||
              !selectedRoleName ||
              (isTenantRole && !selectedVillaId)
            }
            style={{ fontWeight: 600 }}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Sending...
              </>
            ) : (
              'Send Invitation'
            )}
          </CButton>
        </CModalFooter>
      </form>
    </CModal>
  )
}

InviteUserModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSendInvite: PropTypes.func.isRequired,
}

export default InviteUserModal
