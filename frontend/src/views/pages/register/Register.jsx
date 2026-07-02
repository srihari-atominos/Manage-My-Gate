import React from 'react';
import { CContainer, CRow, CCol } from '@coreui/react';
import RegisterForm from '../../../features/auth/components/RegisterForm.jsx';

const Register = () => {
  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center" style={{ backgroundColor: '#0b0f19' }}>
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={9} lg={7} xl={6} className="d-flex justify-content-center">
            <RegisterForm />
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default Register;
