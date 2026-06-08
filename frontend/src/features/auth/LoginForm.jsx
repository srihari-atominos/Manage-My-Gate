import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, clearStatus } from './authSlice.js';
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser } from '@coreui/icons';

export const LoginForm = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, successMsg, token } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearStatus());
  }, [dispatch]);

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!login.trim()) {
      setValidationError('Username or Email is required.');
      return;
    }
    if (!password) {
      setValidationError('Password is required.');
      return;
    }

    dispatch(loginUser({ login: login.trim(), password }));
  };

  return (
    <CCardGroup style={styles.cardGroup}>
      <CCard style={styles.loginCard}>
        <CCardBody style={styles.cardBody}>
          <CForm onSubmit={handleSubmit}>
            <h1 style={styles.title}>Login</h1>
            <p style={styles.subtitle}>Sign In to your enterprise account</p>

            {validationError && (
              <CAlert color="danger" style={styles.alert}>
                {validationError}
              </CAlert>
            )}

            {error && (
              <CAlert color="danger" style={styles.alert}>
                {error}
              </CAlert>
            )}

            {successMsg && (
              <CAlert color="success" style={styles.alert}>
                {successMsg}
              </CAlert>
            )}

            <CInputGroup className="mb-3">
              <CInputGroupText style={styles.inputIconText}>
                <CIcon icon={cilUser} style={styles.icon} />
              </CInputGroupText>
              <CFormInput
                style={styles.input}
                placeholder="Username or Email"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={loading}
              />
            </CInputGroup>

            <CInputGroup className="mb-4">
              <CInputGroupText style={styles.inputIconText}>
                <CIcon icon={cilLockLocked} style={styles.icon} />
              </CInputGroupText>
              <CFormInput
                style={styles.input}
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </CInputGroup>

            <CRow>
              <CCol xs={12} className="d-grid mb-3">
                <CButton type="submit" color="primary" style={styles.submitButton} disabled={loading}>
                  {loading ? <CSpinner size="sm" variant="grow" /> : 'Login'}
                </CButton>
              </CCol>
              <CCol xs={12} className="text-center">
                <CButton color="link" className="px-0" style={styles.linkButton}>
                  Forgot password?
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        </CCardBody>
      </CCard>

      <CCard style={styles.promoCard}>
        <CCardBody style={styles.promoCardBody}>
          <div>
            <h2 style={styles.promoTitle}>Dynamic RBAC Suite</h2>
            <p style={styles.promoText}>
              Access our industry-leading authentication client. Empowering secure, granular, permission-based dashboards with live role management.
            </p>
            <Link to="/register">
              <CButton 
                color="light" 
                style={styles.registerLinkButton}
                active 
                tabIndex={-1}
              >
                Register Now!
              </CButton>
            </Link>
          </div>
        </CCardBody>
      </CCard>
    </CCardGroup>
  );
};

const styles = {
  cardGroup: {
    maxWidth: '850px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  loginCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '32px 16px',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '8px',
    letterSpacing: '-0.025em',
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: '15px',
    marginBottom: '24px',
  },
  inputIconText: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#a1a1aa',
  },
  icon: {
    width: '18px',
    height: '18px',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#ffffff',
    padding: '12px',
  },
  alert: {
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
    transition: 'all 0.2s',
  },
  linkButton: {
    color: '#818cf8',
    fontSize: '14px',
    textDecoration: 'none',
  },
  promoCard: {
    background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '40px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCardBody: {
    textAlign: 'center',
    maxWidth: '320px',
  },
  promoTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '16px',
  },
  promoText: {
    color: '#c7d2fe',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '28px',
  },
  registerLinkButton: {
    color: '#1e1b4b',
    background: '#ffffff',
    fontWeight: '600',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(255,255,255,0.15)',
    transition: 'transform 0.2s',
  },
};

export default LoginForm;
