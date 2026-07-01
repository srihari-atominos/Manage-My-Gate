import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { loginUser } from './store/authSlice.js';
import useAuthRouting from './hooks/useAuthRouting.js';
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

/**
 * Standard Login Form component.
 * Features username/email & password inputs and basic validation.
 * Adheres to the "Thin View" architectural pattern.
 */
export const LoginForm = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { handlePostAuthRedirect, isAuthenticated, loading, error } = useAuthRouting();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      login: '',
      password: '',
    },
  });

  // Automatically handle routing updates post-authentication
  useEffect(() => {
    if (isAuthenticated) {
      handlePostAuthRedirect();
    }
  }, [isAuthenticated]);

  const onSubmit = (data) => {
    dispatch(loginUser({ login: data.login.trim(), password: data.password }));
  };

  return (
    <div style={styles.container}>
      <CCardGroup style={styles.cardGroup}>
        {/* Left Side: Login Form */}
        <CCard style={styles.leftCard}>
          <CCardBody style={styles.cardBody}>
            <CForm onSubmit={handleSubmit(onSubmit)}>
              <h1 style={styles.title}>{t('auth.login.title', { defaultValue: 'Login' })}</h1>
              <p style={styles.subtitle}>{t('auth.login.subtitle', { defaultValue: 'Sign In to your enterprise account' })}</p>

              {error && (
                <CAlert color="danger" style={styles.alert}>
                  {error}
                </CAlert>
              )}

              <div className="mb-3">
                <CInputGroup>
                  <CInputGroupText style={styles.leftInputIconText}>
                    <CIcon icon={cilUser} style={styles.icon} />
                  </CInputGroupText>
                  <CFormInput
                    style={styles.leftInput}
                    placeholder={t('auth.login.usernamePlaceholder', { defaultValue: 'Username or Email' })}
                    autoComplete="username"
                    disabled={loading}
                    {...register('login', {
                      required: t('auth.login.loginRequired', { defaultValue: 'Username or Email is required.' }),
                    })}
                  />
                </CInputGroup>
                {errors.login && (
                  <div className="text-danger small mt-1 ms-1">{errors.login.message}</div>
                )}
              </div>

              <div className="mb-4">
                <CInputGroup>
                  <CInputGroupText style={styles.leftInputIconText}>
                    <CIcon icon={cilLockLocked} style={styles.icon} />
                  </CInputGroupText>
                  <CFormInput
                    style={styles.leftInput}
                    type="password"
                    placeholder={t('auth.login.passwordPlaceholder', { defaultValue: 'Password' })}
                    autoComplete="current-password"
                    disabled={loading}
                    {...register('password', {
                      required: t('auth.login.passwordRequired', { defaultValue: 'Password is required.' }),
                      minLength: {
                        value: 6,
                        message: t('auth.login.passwordLength', { defaultValue: 'Password must be at least 6 characters long.' }),
                      },
                    })}
                  />
                </CInputGroup>
                {errors.password && (
                  <div className="text-danger small mt-1 ms-1">{errors.password.message}</div>
                )}
              </div>

              <CRow className="align-items-center">
                <CCol xs={6} className="d-grid">
                  <CButton type="submit" color="primary" style={styles.submitButton} disabled={loading}>
                    {loading ? <CSpinner size="sm" variant="grow" /> : t('auth.login.submit', { defaultValue: 'Login' })}
                  </CButton>
                </CCol>
                <CCol xs={6} className="text-end">
                  <CButton color="link" className="px-0" style={styles.forgotLink}>
                    {t('auth.login.forgotPassword', { defaultValue: 'Forgot password?' })}
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>

        {/* Right Side: Promotional Panel */}
        <CCard style={styles.rightCard}>
          <CCardBody style={styles.rightCardBody}>
            <div>
              <h2 style={styles.rightTitle}>{t('auth.login.promoTitle', { defaultValue: 'Enterprise Workspace Platform' })}</h2>
              <p style={styles.rightText}>
                {t('auth.login.promoText', {
                  defaultValue: 'Access your secure organization workspace, manage team privileges, configure third-party API integrations, and view full audit records in one unified dashboard.',
                })}
              </p>
              <div className="d-grid mt-4">
                <CButton
                  color="light"
                  style={styles.registerButton}
                  onClick={() => navigate('/register')}
                >
                  {t('auth.login.registerNow', { defaultValue: 'Register Now!' })}
                </CButton>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCardGroup>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
  },
  cardGroup: {
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    borderRadius: '16px',
    overflow: 'hidden',
    border: 'none',
  },
  leftCard: {
    background: '#ffffff',
    border: 'none',
    padding: '40px 24px',
    color: '#1f2937',
  },
  rightCard: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    border: 'none',
    padding: '40px 24px',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  rightCardBody: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
    width: '100%',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '8px',
    letterSpacing: '-0.025em',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '15px',
    marginBottom: '24px',
  },
  leftInputIconText: {
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    color: '#6b7280',
  },
  icon: {
    width: '18px',
    height: '18px',
  },
  leftInput: {
    background: '#ffffff',
    border: '1px solid #d1d5db',
    color: '#1f2937',
    padding: '12px',
  },
  alert: {
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
  },
  forgotLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
  },
  rightTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '16px',
    letterSpacing: '-0.025em',
  },
  rightText: {
    color: '#bfdbfe',
    fontSize: '15px',
    lineHeight: '1.6',
    marginBottom: '20px',
  },
  registerButton: {
    background: '#ffffff',
    color: '#1e3a8a',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
    transition: 'all 0.2s',
  },
};

export default LoginForm;
