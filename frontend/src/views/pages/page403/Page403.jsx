import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCol, CContainer, CRow } from '@coreui/react'

const Page403 = () => {
  const navigate = useNavigate()

  return (
    <div className="d-flex flex-row align-items-center py-5">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6} className="text-center">
            <div className="clearfix mb-4">
              <h1 className="display-1 fw-bold text-danger">403</h1>
              <h3 className="fw-semibold">Access Forbidden</h3>
              <p className="text-body-secondary">
                You do not have the required permissions to view this page. If you believe this is
                an error, please contact your administrator.
              </p>
            </div>
            <div className="d-flex justify-content-center gap-3">
              <CButton color="secondary" onClick={() => navigate(-1)} className="px-4 fw-semibold">
                Go Back
              </CButton>
              <CButton
                color="primary"
                onClick={() => navigate('/dashboard')}
                className="px-4 fw-semibold"
              >
                Go to Dashboard
              </CButton>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Page403
