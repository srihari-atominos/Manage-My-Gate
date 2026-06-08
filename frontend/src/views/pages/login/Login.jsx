import React from 'react';
import { CContainer, CRow, CCol } from '@coreui/react';
import LoginForm from '../../../features/auth/LoginForm.jsx';

const Login = () => {
  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center" style={{ backgroundColor: '#0b0f19' }}>
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={10} className="d-flex justify-content-center">
            <LoginForm />
          </CCol>
        </CRow>
      </CContainer>
    </div>
  );
};

export default Login;
