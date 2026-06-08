import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormInput,
  CButton,
} from '@coreui/react'

/**
 * InviteUserModal Component
 * 
 * Renders modal overlay containing form inputs for inviting new organization users.
 * Isolates local input state and handlers.
 */
const InviteUserModal = ({ visible, onClose, onSendInvite }) => {
  const [inviteEmail, setInviteEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    onSendInvite(inviteEmail)
    setInviteEmail('')
  }

  const handleClose = () => {
    setInviteEmail('')
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
          Invite User
        </CModalTitle>
      </CModalHeader>
      <form onSubmit={handleSubmit}>
        <CModalBody>
          <CFormLabel htmlFor="invite-email-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Email Address
          </CFormLabel>
          <CFormInput
            id="invite-email-input"
            type="email"
            placeholder="user@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            autoFocus
          />
          <div className="mt-2" style={{ fontSize: '0.78rem', color: 'var(--cui-text-muted)' }}>
            An invitation email will be sent to this address.
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
            disabled={!inviteEmail.trim()}
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
