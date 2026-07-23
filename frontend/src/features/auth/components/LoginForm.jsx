import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthRouting from '../hooks/useAuthRouting.js';
import useAuth from '../hooks/useAuth.js';
import ForgotPasswordModal from './ForgotPasswordModal.jsx';
import { GoogleLogin } from '@react-oauth/google';
import { useMsal } from '@azure/msal-react';
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
  CFormCheck,
  CFormSelect,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser, cilScreenSmartphone } from '@coreui/icons';
import '../styles/_auth.scss';

/**
 * LoginFormErrorBoundary Component
 * Isolates runtime UI crashes in the LoginForm.
 */
class LoginFormErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LoginForm Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-error-boundary-container p-4 text-center">
          <h3 className="text-danger">Something went wrong.</h3>
          <p>Please try reloading the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Standard Login Form component.
 * Features username/email & password inputs and basic validation.
 * Adheres to the "Thin View" architectural pattern.
 */
export const LoginForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handlePostAuthRedirect, isAuthenticated, loading, error } = useAuthRouting();
  const { login, loginGoogle, loginMicrosoft, sendOtp, verifyOtp, otpSent, clearStatus } = useAuth();
  
  const inviteTokenParam = searchParams.get('invite_token');
  const emailParam = searchParams.get('email');

  const [loginMethod, setLoginMethod] = useState('password'); // 'password', 'phone', 'email'
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberedEmail') !== null);
  const [countryCode, setCountryCode] = useState('+91');
  const [otpTimer, setOtpTimer] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      login: emailParam ? decodeURIComponent(emailParam) : (localStorage.getItem('rememberedEmail') || ''),
      password: '',
    },
  });

  // Automatically pre-fill email if invite query param is present
  useEffect(() => {
    if (emailParam) {
      setValue('login', decodeURIComponent(emailParam));
      setLoginMethod('password');
    }
  }, [emailParam, setValue]);

  // Automatically handle routing updates post-authentication
  useEffect(() => {
    if (isAuthenticated) {
      handlePostAuthRedirect();
    }
  }, [isAuthenticated]);

  // Handle OTP countdown timer
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  const { instance: msalInstance } = useMsal();

  const handleMicrosoftLogin = () => {
    let retries = 0;
    const triggerLogin = () => {
      msalInstance.loginPopup({
        scopes: ['openid', 'profile', 'user.read'],
      })
      .then((response) => {
        if (response && response.idToken) {
          loginMicrosoft(response.idToken, inviteTokenParam);
        }
      })
      .catch((err) => {
        console.error('Microsoft login failed:', err);
        // Automatically recover from MSAL's notoriously sticky interaction_in_progress bug
        if (
          (err.errorCode === 'interaction_in_progress' || (err.message && err.message.includes('interaction_in_progress'))) &&
          retries < 3
        ) {
          retries++;
          sessionStorage.clear();
          triggerLogin();
        } else {
          import('react-hot-toast').then(({ toast }) => {
            toast.error(t('auth.login.msalFailed', 'Microsoft login failed: {{error}}', { error: err.message || 'Unknown error' }));
          });
        }
      });
    };

    triggerLogin();
  };

  const handleSendOtp = async (identifier, isEmail) => {
    const resultAction = await sendOtp(identifier, isEmail);
    if (resultAction.meta.requestStatus === 'fulfilled') {
      setOtpTimer(60);
    }
  };

  const onSubmit = async (data) => {
    if (loginMethod === 'password') {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', data.login.trim());
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      const res = await login({
        login: data.login.trim(),
        password: data.password,
        inviteToken: inviteTokenParam || undefined,
      });
      if (res?.success) {
        handlePostAuthRedirect();
      }
    } else {
      const isEmail = loginMethod === 'email';
      const identifier = loginMethod === 'phone' ? `${countryCode} ${data.login.trim()}` : data.login.trim();
      
      if (!otpSent) {
        await handleSendOtp(identifier, isEmail);
      } else {
        const res = await verifyOtp(identifier, otpCode, isEmail);
        if (res?.success) {
          handlePostAuthRedirect();
        }
      }
    }
  };

  return (
    <div className="login-container">
      <CCardGroup className="login-card-group">
        {/* Left Side: Login Form */}
        <CCard className="login-left-card">
          <CCardBody className="login-card-body">
            <CForm onSubmit={handleSubmit(onSubmit)}>
              <h1 className="login-title">{t('auth.login.title', 'Welcome Back')}</h1>
              <p className="login-subtitle">{t('auth.login.subtitle', 'Choose your preferred sign-in method.')}</p>

              <div className="login-method-toggle">
                <button
                  type="button"
                  className={`login-method-tab ${loginMethod === 'password' ? 'active' : ''}`}
                  onClick={() => { 
                    setLoginMethod('password'); 
                    clearStatus(); 
                    setOtpTimer(0); 
                    setOtpCode(''); 
                    setValue('login', localStorage.getItem('rememberedEmail') || '');
                    clearErrors();
                  }}
                >
                  {t('auth.login.passwordTab', 'Password Login')}
                </button>
                <button
                  type="button"
                  className={`login-method-tab ${loginMethod === 'phone' ? 'active' : ''}`}
                  onClick={() => { 
                    setLoginMethod('phone'); 
                    clearStatus(); 
                    setOtpTimer(0); 
                    setOtpCode(''); 
                    setValue('login', '');
                    clearErrors();
                  }}
                >
                  {t('auth.login.mobileTab', 'Mobile Login')}
                </button>
                <button
                  type="button"
                  className={`login-method-tab ${loginMethod === 'email' ? 'active' : ''}`}
                  onClick={() => { 
                    setLoginMethod('email'); 
                    clearStatus(); 
                    setOtpTimer(0); 
                    setOtpCode(''); 
                    setValue('login', '');
                    clearErrors();
                  }}
                >
                  {t('auth.login.emailOtpTab', 'Email OTP')}
                </button>
              </div>

              {error && (
                <CAlert color="danger" className="login-alert">
                  {error}
                </CAlert>
              )}

              <div className="mb-3">
                <CInputGroup>
                  {loginMethod === 'phone' ? (
                    <>
                      <CInputGroupText className="login-input-icon-text">
                        <CIcon icon={cilScreenSmartphone} className="login-icon" />
                      </CInputGroupText>
                      <CFormSelect
                        className="login-country-select"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={loading || otpSent}
                        aria-label={t('auth.login.countryCodeLabel', 'Country Code')}
                      >
                        <option value="+1">+1 (US)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+61">+61 (AU)</option>
                        <option value="+971">+971 (AE)</option>
                      </CFormSelect>
                    </>
                  ) : (
                    <CInputGroupText className="login-input-icon-text">
                      <CIcon icon={cilUser} className="login-icon" />
                    </CInputGroupText>
                  )}
                  <CFormInput
                    className="login-input"
                    placeholder={
                      loginMethod === 'password' ? t('auth.login.usernamePlaceholder', 'Email Address') :
                      loginMethod === 'email' ? t('auth.login.emailPlaceholder', 'Email Address') : t('auth.login.mobilePlaceholder', 'Mobile Number')
                    }
                    autoComplete="username"
                    disabled={loading || otpSent}
                    autoFocus
                    {...register('login', {
                      required: t('auth.login.loginRequired', 'Identifier is required.'),
                    })}
                  />
                </CInputGroup>
                {errors.login && (
                  <div className="text-danger small mt-1 ms-1">{errors.login.message}</div>
                )}
              </div>

              {loginMethod === 'password' && (
                <div className="mb-4">
                  <CInputGroup>
                    <CInputGroupText className="login-input-icon-text">
                      <CIcon icon={cilLockLocked} className="login-icon" />
                    </CInputGroupText>
                    <CFormInput
                      className="login-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.login.passwordPlaceholder', 'Password')}
                      autoComplete="current-password"
                      disabled={loading}
                      {...register('password', {
                        required: loginMethod === 'password' ? t('auth.login.passwordRequired', 'Password is required.') : false,
                        minLength: loginMethod === 'password' ? {
                          value: 6,
                          message: t('auth.login.passwordLength', 'Password must be at least 6 characters long.'),
                        } : undefined,
                      })}
                    />
                    <CInputGroupText 
                      onClick={() => setShowPassword(!showPassword)} 
                      style={{ cursor: 'pointer', background: '#f3f4f6', border: '1px solid #d1d5db', color: '#6b7280', fontSize: '13px' }}
                    >
                      {showPassword ? t('auth.login.hide', 'Hide') : t('auth.login.show', 'Show')}
                    </CInputGroupText>
                  </CInputGroup>
                  {errors.password && (
                    <div className="text-danger small mt-1 ms-1">{errors.password.message}</div>
                  )}
                </div>
              )}

              {loginMethod !== 'password' && otpSent && (
                <div className="mb-4">
                  <CInputGroup>
                    <CInputGroupText className="login-input-icon-text">OTP</CInputGroupText>
                    <CFormInput
                      className="login-input"
                      placeholder={t('auth.login.otpPlaceholder', 'Enter 6-digit Code')}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </CInputGroup>
                  <div className="text-end mt-2">
                    <CButton 
                      color="link" 
                      className="px-0 small text-muted text-decoration-none" 
                      disabled={loading || otpTimer > 0}
                      onClick={() => {
                        const isEmail = loginMethod === 'email';
                        const identifier = loginMethod === 'phone' ? `${countryCode} ${watch('login').trim()}` : watch('login').trim();
                        handleSendOtp(identifier, isEmail);
                      }}
                    >
                      {otpTimer > 0 ? `${t('auth.login.resendOtpIn', 'Resend OTP in')} ${otpTimer}s` : t('auth.login.resendOtp', 'Resend OTP')}
                    </CButton>
                  </div>
                </div>
              )}

              {loginMethod === 'password' && (
                <CRow className="mb-3">
                  <CCol xs={6}>
                    <CFormCheck 
                      id="rememberMe" 
                      label={t('auth.login.rememberMe', 'Remember Me')} 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)} 
                    />
                  </CCol>
                  <CCol xs={6} className="text-end">
                    <CButton color="link" className="px-0 text-decoration-none login-forgot-link" onClick={() => setForgotModalVisible(true)}>
                      {t('auth.login.forgotPassword', 'Forgot password?')}
                    </CButton>
                  </CCol>
                </CRow>
              )}

              <div className="d-grid mb-1">
                <CButton type="submit" color="primary" className="login-submit-btn" disabled={loading}>
                  {loading ? <CSpinner size="sm" variant="grow" /> : 
                   (loginMethod !== 'password' && !otpSent) ? t('auth.login.sendOtp', 'Send OTP') : t('auth.login.submit', 'Login')}
                </CButton>
              </div>

              <div className="login-divider">
                <div className="login-divider-line"></div>
                <span className="login-divider-text">{t('auth.login.orContinueWith', 'or continue with')}</span>
                <div className="login-divider-line"></div>
              </div>

              <CRow className="g-3 align-items-center justify-content-center">
                <CCol xs={12} sm={6} className="d-flex justify-content-center">
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                      onSuccess={credentialResponse => loginGoogle(credentialResponse.credential, inviteTokenParam)}
                      onError={() => console.error('Google Sign-In failed')}
                      type="standard"
                      theme="outline"
                      size="large"
                      width="220px"
                    />
                  </div>
                </CCol>
                <CCol xs={12} sm={6}>
                  <button
                    type="button"
                    onClick={handleMicrosoftLogin}
                    className="login-sso-btn"
                    disabled={loading}
                  >
                    {/* Official Microsoft 4-square SVG */}
                    <svg className="login-sso-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                    {t('auth.login.continueWithMicrosoft', 'Continue with Microsoft')}
                  </button>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>

        {/* Right Side: Promotional Panel */}
        <CCard className="login-right-card">
          <CCardBody className="login-right-card-body">
            <div>
              <h2 className="login-right-title">{t('auth.login.promoTitle', 'Enterprise Workspace Platform')}</h2>
              <p className="login-right-text">
                {t('auth.login.promoText', 'Access your secure organization workspace, manage team privileges, configure third-party API integrations, and view full audit records in one unified dashboard.')}
              </p>
              <div className="d-grid mt-4">
                <CButton
                  color="light"
                  className="login-register-btn"
                  onClick={() => navigate('/register')}
                >
                  {t('auth.login.registerNow', 'Register Now!')}
                </CButton>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCardGroup>
      
      <ForgotPasswordModal visible={forgotModalVisible} setVisible={setForgotModalVisible} />
    </div>
  );
};

export default function LoginFormWithBoundary(props) {
  return (
    <LoginFormErrorBoundary>
      <LoginForm {...props} />
    </LoginFormErrorBoundary>
  );
}
