import React from 'react'
import { CContainer, CRow, CCol } from '@coreui/react'
import LoginForm from '../../../features/auth/components/LoginForm.jsx'
import loginBG from '../../../assets/images/loginBackGr.avif'

const Login = () => {
  return (
    <div
      className="min-vh-100 d-flex flex-row align-items-center position-relative overflow-hidden"
      style={{ backgroundColor: '#f0f4f8' }}
    >
      {/* Background Image Layer with Subtle Animation */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${loginBG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 1,
          animation: 'subtlePanZoom 30s ease-in-out infinite alternate',
        }}
      />

      {/* Injecting CSS Keyframes locally */}
      <style>
        {`
          @keyframes subtlePanZoom {
            0% {
              transform: scale(1.0) translate(0, 0);
            }
            100% {
              transform: scale(1.1) translate(-1%, -1%);
            }
          }
        `}
      </style>

      {/* Light frosted overlay for contrast */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.4) 100%)',
          backdropFilter: 'blur(2px)',
          zIndex: 2,
        }}
      />

      {/* Form Content */}
      <CContainer style={{ position: 'relative', zIndex: 4 }}>
        <CRow className="justify-content-center">
          <CCol md={10} className="d-flex justify-content-center">
            <LoginForm />
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
