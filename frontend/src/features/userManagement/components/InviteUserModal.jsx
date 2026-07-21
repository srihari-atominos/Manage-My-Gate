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
} from '@coreui/react'
import apiClient from '../../../services/apiClient'

/**
 * InviteUserModal Component
 * 
 * Renders modal overlay containing form inputs for inviting new community users.
 */
const InviteUserModal = ({ visible, onClose, onSendInvite }) => {
  const [inviteEmail, setInviteEmail] = useState('')
  const [villas, setVillas] = useState([])
  const [selectedVillaId, setSelectedVillaId] = useState('')
  const [roles, setRoles] = useState([])
  const [selectedRoleName, setSelectedRoleName] = useState('')
  const [loadingVillas, setLoadingVillas] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)

  useEffect(() => {
    if (visible) {
      setLoadingVillas(true)
      apiClient.get('/villas?limit=1000')
        .then(res => {
          setVillas(res.data?.data || [])
        })
        .catch(err => {
          console.error('Failed to load villas for invite dropdown:', err)
        })
        .finally(() => {
          setLoadingVillas(false)
        })

      setLoadingRoles(true)
      apiClient.get('/roles?limit=100')
        .then(res => {
          setRoles(res.data?.data || [])
        })
        .catch(err => {
          console.error('Failed to load roles for invite dropdown:', err)
        })
        .finally(() => {
          setLoadingRoles(false)
        })
    }
  }, [visible])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    const selectedRole = roles.find(r => r.name === selectedRoleName)
    const isTenant = selectedRole ? selectedRole.isTenantRole : false

    // Determine residentType based on roleName
    let residentType = 'None'
    if (isTenant && selectedRoleName) {
      const lowerName = selectedRoleName.toLowerCase()
      if (lowerName.includes('owner')) residentType = 'Owner'
      else if (lowerName.includes('tenant')) residentType = 'Tenant'
      else if (lowerName.includes('family')) residentType = 'Family'
      else residentType = 'Guest' // Fallback for other tenant roles
    }

    onSendInvite({
      email: inviteEmail.trim(),
      villaId: isTenant ? selectedVillaId || null : null,
      residentType,
      roleName: selectedRoleName || null
    })
    
    setInviteEmail('')
    setSelectedVillaId('')
    setSelectedRoleName('')
  }

  const handleClose = () => {
    setInviteEmail('')
    setSelectedVillaId('')
    setSelectedRoleName('')
    onClose()
  }

  const selectedRoleObj = roles.find(r => r.name === selectedRoleName)
  const isTenantRole = selectedRoleObj ? selectedRoleObj.isTenantRole : false

  return (
    <CModal
      visible={visible}
      onClose={handleClose}
      id="invite-user-modal"
      alignment="center"
    >
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem', fontWeight: 700 }}>
          Invite Resident / Community Staff
        </CModalTitle>
      </CModalHeader>
      <form onSubmit={handleSubmit}>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel htmlFor="invite-email-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Email Address
            </CFormLabel>
            <CFormInput
              id="invite-email-input"
              type="email"
              placeholder="resident@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="invite-role-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Select Role
            </CFormLabel>
            <CFormSelect
              id="invite-role-select"
              value={selectedRoleName}
              onChange={(e) => setSelectedRoleName(e.target.value)}
              className="form-select-sm"
              required
              disabled={loadingRoles}
            >
              <option value="">-- Choose a Role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name} ({role.isTenantRole ? 'Tenant/Unit' : 'Global'})
                </option>
              ))}
            </CFormSelect>
          </div>

          {isTenantRole && (
            <div className="mb-3 position-relative">
              <CFormLabel htmlFor="invite-villa-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Select Villa / Unit
              </CFormLabel>
              <div className="dropdown w-100">
                <button
                  className="btn btn-outline-secondary w-100 text-start d-flex justify-content-between align-items-center form-select-sm bg-white"
                  type="button"
                  data-coreui-toggle="dropdown"
                  aria-expanded="false"
                  disabled={loadingVillas}
                  onClick={(e) => {
                    const menu = e.currentTarget.nextElementSibling;
                    if (menu.classList.contains('show')) {
                      menu.classList.remove('show');
                    } else {
                      menu.classList.add('show');
                    }
                  }}
                >
                  {selectedVillaId 
                    ? (() => {
                        const v = villas.find(v => v._id === selectedVillaId);
                        return v ? `${v.unitNumber} ${v.blockOrBuilding ? `(${v.blockOrBuilding})` : ''}` : '-- Choose a Villa --';
                      })()
                    : '-- Choose a Villa --'}
                  <span className="caret"></span>
                </button>
                <ul className="dropdown-menu w-100 shadow-sm" style={{ maxHeight: '200px', overflowY: 'auto', position: 'absolute', zIndex: 9999 }}>
                  <li>
                    <button
                      className="dropdown-item"
                      type="button"
                      onClick={(e) => {
                        setSelectedVillaId('');
                        e.currentTarget.closest('.dropdown-menu').classList.remove('show');
                      }}
                    >
                      -- Choose a Villa --
                    </button>
                  </li>
                  {villas.map((villa) => (
                    <li key={villa._id}>
                      <button
                        className="dropdown-item"
                        type="button"
                        onClick={(e) => {
                          setSelectedVillaId(villa._id);
                          e.currentTarget.closest('.dropdown-menu').classList.remove('show');
                        }}
                      >
                        {villa.unitNumber} {villa.blockOrBuilding ? `(${villa.blockOrBuilding})` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="mt-2" style={{ fontSize: '0.78rem', color: 'var(--cui-text-muted)' }}>
            An invitation email will be sent with a link to setup credentials.
          </div>
        </CModalBody>
        <CModalFooter className="border-0 pt-0">
          <CButton
            color="light"
            size="sm"
            onClick={handleClose}
          >
            Cancel
          </CButton>
          <CButton
            id="send-invitation-btn"
            type="submit"
            color="primary"
            size="sm"
            disabled={!inviteEmail.trim() || !selectedRoleName || (isTenantRole && !selectedVillaId)}
            style={{ fontWeight: 600 }}
          >
            Send Invitation
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
