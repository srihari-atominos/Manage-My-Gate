import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, clearStatus } from './store/authSlice.js';
import apiClient from '../../utils/apiClient.js';
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
  CSpinner,
  CFormSelect,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser } from '@coreui/icons';
import logger from '../../utils/logger.js';

export const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, successMsg } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearStatus());
    
    // Fetch available roles publicly for dropdown
    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const response = await apiClient.get('/auth/roles');
        if (response.data) {
          setRoles(response.data);
          if (response.data.length > 0) {
            setRoleId(response.data[0]._id);
          }
        }
      } catch (err) {
        logger.error('Failed to fetch roles for signup dropdown', err);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!username.trim() || !email.trim() || !password || !confirmPassword || !roleId) {
      setValidationError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    dispatch(
      registerUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        roleId,
      })
    ).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    });
  };

  return (
    <CCard style={styles.card}>
      <CCardBody style={styles.cardBody}>
        <CForm onSubmit={handleSubmit}>
          <h1 style={styles.title}>Register</h1>
          <p style={styles.subtitle}>Create your enterprise account</p>

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
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </CInputGroup>

          <CInputGroup className="mb-3">
            <CInputGroupText style={styles.inputIconText}>@</CInputGroupText>
            <CFormInput
              style={styles.input}
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </CInputGroup>

          <CInputGroup className="mb-3">
            <CInputGroupText style={styles.inputIconText}>
              <CIcon icon={cilLockLocked} style={styles.icon} />
            </CInputGroupText>
            <CFormInput
              style={styles.input}
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </CInputGroup>

          <CInputGroup className="mb-3">
            <CInputGroupText style={styles.inputIconText}>
              <CIcon icon={cilLockLocked} style={styles.icon} />
            </CInputGroupText>
            <CFormInput
              style={styles.input}
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </CInputGroup>

          <CInputGroup className="mb-4">
            <CInputGroupText style={styles.inputIconText}>Role</CInputGroupText>
            <CFormSelect
              style={styles.select}
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={loading || rolesLoading}
            >
              {rolesLoading ? (
                <option>Loading roles...</option>
              ) : (
                roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))
              )}
            </CFormSelect>
          </CInputGroup>

          <CRow>
            <CCol xs={12} className="d-grid mb-3">
              <CButton type="submit" color="success" style={styles.submitButton} disabled={loading}>
                {loading ? <CSpinner size="sm" variant="grow" /> : 'Create Account'}
              </CButton>
            </CCol>
            <CCol xs={12} className="text-center">
              <Link to="/login" style={styles.loginLink}>
                Already have an account? Log In
              </Link>
            </CCol>
          </CRow>
        </CForm>
      </CCardBody>
    </CCard>
  );
};

const styles = {
  card: {
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
    borderRadius: '16px',
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '24px 16px',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
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
    minWidth: '50px',
    justifyContent: 'center',
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
  select: {
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
    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.2s',
  },
  loginLink: {
    color: '#34d399',
    fontSize: '14px',
    textDecoration: 'none',
  },
};

export default RegisterForm;
