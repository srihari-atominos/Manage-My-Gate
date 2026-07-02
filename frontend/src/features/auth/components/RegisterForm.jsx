import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import useAuthRouting from '../hooks/useAuthRouting.js';
import useAuth from '../hooks/useAuth.js';
import {
  CButton,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CCol,
  CAlert,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser } from '@coreui/icons';

/**
 * RegisterForm Component
 * Refactored to support a toggleable "Get Started" view (Login vs Register)
 * Adheres to the "Thin View" architectural pattern.
 */
export const RegisterForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoginMode, setIsLoginMode] = useState(location.pathname === '/login-createOrg');

  const { loading, error, successMsg, login, register: authRegister, clearStatus } = useAuth();
  const { handlePostAuthRedirect, isAuthenticated } = useAuthRouting();

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    clearStatus();
  }, [isLoginMode]);

  // Sync mode and form state with the active URL path
  useEffect(() => {
    setIsLoginMode(location.pathname === '/login-createOrg');
    setValue('password', '');
    setValue('confirmPassword', '');
    clearErrors();
  }, [location.pathname]);

  // When changing mode, navigate to the correct onboarding route
  const toggleMode = () => {
    if (isLoginMode) {
      navigate('/register');
    } else {
      navigate('/login-createOrg');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      handlePostAuthRedirect();
    }
  }, [isAuthenticated]);

  const onSubmit = (data) => {
    if (isLoginMode) {
      login({ login: data.email.trim(), password: data.password });
    } else {
      // Generate valid alphanumeric username from email prefix to satisfy backend validator
      const emailPrefix = data.email.trim().split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      let derivedUsername = emailPrefix;
      if (derivedUsername.length < 3) {
        derivedUsername = 'user' + Math.floor(100 + Math.random() * 900);
      } else if (derivedUsername.length > 30) {
        derivedUsername = derivedUsername.substring(0, 30);
      }

      authRegister({
        name: data.name.trim(),
        username: derivedUsername,
        email: data.email.trim().toLowerCase(),
        password: data.password,
      }).then((action) => {
        if (action.meta.requestStatus === 'fulfilled') {
          setTimeout(() => {
            navigate('/workspace-setup?intent=create');
          }, 1500);
        }
      });
    }
  };

  return (
    <CCard style={styles.card}>
      <CCardBody style={styles.cardBody}>
        {/* Top Section Info Alert */}
        <CAlert color="info" style={styles.alertHeader}>
          <h5 className="alert-heading fw-semibold">
            {t('auth.register.alertTitle', { defaultValue: 'Why do we need this login?' })}
          </h5>
          <p className="mb-0">
            {t('auth.register.alertText', {
              defaultValue:
                'This login gives you access to the Enterprise Workspace Platform, where you can create and manage your organization securely.',
            })}
          </p>
        </CAlert>

        <CForm onSubmit={handleSubmit(onSubmit)}>
          <h1 style={styles.title}>
            {isLoginMode
              ? t('auth.register.loginTitle', { defaultValue: 'Log In to Your Account' })
              : t('auth.register.title', { defaultValue: 'Create Your Account' })}
          </h1>
          <p style={styles.subtitle}>
            {isLoginMode
              ? t('auth.register.loginSubtitle', { defaultValue: 'Access the platform securely' })
              : t('auth.register.subtitle', { defaultValue: 'Create your credentials to get started' })}
          </p>

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

          {/* Full Name */}
          {!isLoginMode && (
            <div className="mb-3">
              <CInputGroup>
                <CInputGroupText style={styles.inputIconText}>
                  <CIcon icon={cilUser} style={styles.icon} />
                </CInputGroupText>
                <CFormInput
                  style={styles.input}
                  placeholder={t('auth.register.fullNamePlaceholder', { defaultValue: 'Full Name' })}
                  autoComplete="name"
                  disabled={loading}
                  {...register('name', {
                    required: !isLoginMode && t('auth.register.nameRequired', { defaultValue: 'Full Name is required.' }),
                  })}
                />
              </CInputGroup>
              {errors.name && (
                <div className="text-danger small mt-1 ms-1">{errors.name.message}</div>
              )}
            </div>
          )}

          {/* Email */}
          <div className="mb-3">
            <CInputGroup>
              <CInputGroupText style={styles.inputIconText}>@</CInputGroupText>
              <CFormInput
                style={styles.input}
                type="email"
                placeholder={t('auth.register.emailPlaceholder', { defaultValue: 'Email' })}
                autoComplete="email"
                disabled={loading}
                {...register('email', {
                  required: t('auth.register.emailRequired', { defaultValue: 'Email address is required.' }),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('auth.register.emailInvalid', { defaultValue: 'Invalid email address.' }),
                  },
                })}
              />
            </CInputGroup>
            {errors.email && (
              <div className="text-danger small mt-1 ms-1">{errors.email.message}</div>
            )}
          </div>

          {/* Password */}
          <div className="mb-3">
            <CInputGroup>
              <CInputGroupText style={styles.inputIconText}>
                <CIcon icon={cilLockLocked} style={styles.icon} />
              </CInputGroupText>
              <CFormInput
                style={styles.input}
                type="password"
                placeholder={t('auth.register.passwordPlaceholder', { defaultValue: 'Password' })}
                autoComplete="new-password"
                disabled={loading}
                {...register('password', {
                  required: t('auth.register.passwordRequired', { defaultValue: 'Password is required.' }),
                  minLength: {
                    value: 6,
                    message: t('auth.register.passwordLength', { defaultValue: 'Password must be at least 6 characters long.' }),
                  },
                })}
              />
            </CInputGroup>
            {errors.password && (
              <div className="text-danger small mt-1 ms-1">{errors.password.message}</div>
            )}
          </div>

          {/* Confirm Password */}
          {!isLoginMode && (
            <div className="mb-4">
              <CInputGroup>
                <CInputGroupText style={styles.inputIconText}>
                  <CIcon icon={cilLockLocked} style={styles.icon} />
                </CInputGroupText>
                <CFormInput
                  style={styles.input}
                  type="password"
                  placeholder={t('auth.register.confirmPasswordPlaceholder', { defaultValue: 'Repeat password' })}
                  autoComplete="new-password"
                  disabled={loading}
                  {...register('confirmPassword', {
                    required: !isLoginMode && t('auth.register.confirmPasswordRequired', { defaultValue: 'Please repeat your password.' }),
                    validate: (value, formValues) =>
                      isLoginMode || value === formValues.password || t('auth.register.passwordsMustMatch', { defaultValue: 'Passwords do not match.' }),
                  })}
                />
              </CInputGroup>
              {errors.confirmPassword && (
                <div className="text-danger small mt-1 ms-1">{errors.confirmPassword.message}</div>
              )}
            </div>
          )}

          <CRow>
            <CCol xs={12} className="d-grid mb-3">
              <CButton type="submit" color="success" style={styles.submitButton} disabled={loading}>
                {loading ? (
                  <CSpinner size="sm" variant="grow" />
                ) : isLoginMode ? (
                  t('auth.register.loginSubmit', { defaultValue: 'Log In' })
                ) : (
                  t('auth.register.submit', { defaultValue: 'Create Account' })
                )}
              </CButton>
            </CCol>
            <CCol xs={12} className="text-center">
              <CButton color="link" onClick={toggleMode} style={styles.toggleLink} className="p-0">
                {isLoginMode
                  ? t('auth.register.signUpLink', { defaultValue: "Don't have an account? Sign Up" })
                  : t('auth.register.loginLink', { defaultValue: 'Already have an account? Login' })}
              </CButton>
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
    color: '#ffffff',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  alertHeader: {
    borderRadius: '12px',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    color: '#bfdbfe',
    marginBottom: '28px',
    padding: '16px',
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
    border: '1px solid rgba(255, 255, 255, 0.08)',
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
    border: '1px solid rgba(255, 255, 255, 0.08)',
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
  toggleLink: {
    color: '#34d399',
    fontSize: '14px',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

export default RegisterForm;
