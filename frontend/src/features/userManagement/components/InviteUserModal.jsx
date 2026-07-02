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
  const [residentType, setResidentType] = useState('None')
  const [loadingVillas, setLoadingVillas] = useState(false)

  useEffect(() => {
    if (visible) {
      setLoadingVillas(true)
      apiClient.get('/villas?limit=100')
        .then(res => {
          setVillas(res.data?.data || [])
        })
        .catch(err => {
          console.error('Failed to load villas for invite dropdown:', err)
        })
        .finally(() => {
          setLoadingVillas(false)
        })
    }
  }, [visible])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    // Map residentType to roleName
    let roleName = ''
    if (residentType === 'Owner') roleName = 'Resident Owner'
    else if (residentType === 'Tenant') roleName = 'Resident Tenant'
    else if (residentType === 'Family') roleName = 'Family Member'
    else if (residentType === 'Security Guard') roleName = 'Security Guard'
    else if (residentType === 'Community Admin') roleName = 'Community Admin'

    onSendInvite({
      email: inviteEmail.trim(),
      villaId: selectedVillaId || null,
      residentType: ['Security Guard', 'Community Admin', 'None'].includes(residentType) ? 'None' : residentType,
      roleName
    })
    
    setInviteEmail('')
    setSelectedVillaId('')
    setResidentType('None')
  }

  const handleClose = () => {
    setInviteEmail('')
    setSelectedVillaId('')
    setResidentType('None')
    onClose()
  }

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
              Resident Type / Role
            </CFormLabel>
            <CFormSelect
              id="invite-role-select"
              value={residentType}
              onChange={(e) => setResidentType(e.target.value)}
              size="sm"
            >
              <option value="None">General / Unassigned</option>
              <option value="Owner">Resident Owner</option>
              <option value="Tenant">Resident Tenant</option>
              <option value="Family">Family Member</option>
              <option value="Security Guard">Security Guard</option>
              <option value="Community Admin">Community Admin</option>
            </CFormSelect>
          </div>

          {['Owner', 'Tenant', 'Family'].includes(residentType) && (
            <div className="mb-3">
              <CFormLabel htmlFor="invite-villa-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Select Villa / Unit
              </CFormLabel>
              <CFormSelect
                id="invite-villa-select"
                value={selectedVillaId}
                onChange={(e) => setSelectedVillaId(e.target.value)}
                size="sm"
                required
                disabled={loadingVillas}
              >
                <option value="">-- Choose a Villa --</option>
                {villas.map((villa) => (
                  <option key={villa._id} value={villa._id}>
                    {villa.villaNumber} {villa.block ? `(${villa.block})` : ''}
                  </option>
                ))}
              </CFormSelect>
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
            disabled={!inviteEmail.trim() || (['Owner', 'Tenant', 'Family'].includes(residentType) && !selectedVillaId)}
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
