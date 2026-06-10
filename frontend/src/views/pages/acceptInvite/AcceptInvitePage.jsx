import React from 'react'
import { CContainer, CRow, CCol } from '@coreui/react'
import AcceptInviteForm from '../../../features/auth/components/AcceptInviteForm'

/**
 * AcceptInvitePage Component
 *
 * simple layout page wrapper centering the invitation/password-set form.
 */
const AcceptInvitePage = () => {
  return (
    <div
      className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center"
      style={{ backgroundColor: '#0b0f19' }}
    >
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={10} className="d-flex justify-content-center">
            <AcceptInviteForm />
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default AcceptInvitePage
