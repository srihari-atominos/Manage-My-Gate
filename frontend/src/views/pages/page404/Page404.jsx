import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCol, CContainer, CRow } from '@coreui/react'

const Page404 = () => {
  const navigate = useNavigate()

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6} className="text-center">
            <div className="clearfix mb-4">
              <h1 className="display-3 fw-bold text-danger">404</h1>
              <h4 className="pt-3 fw-semibold">Oops! You're lost.</h4>
              <p className="text-body-secondary">The page you are looking for was not found.</p>
            </div>
            <CButton color="primary" onClick={() => navigate('/')} className="px-4 fw-semibold">
              Back to Home
            </CButton>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Page404
