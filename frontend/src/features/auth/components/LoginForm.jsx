import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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

/**
 * Standard Login Form component.
 * Features username/email & password inputs and basic validation.
 * Adheres to the "Thin View" architectural pattern.
 */
export const LoginForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { handlePostAuthRedirect, isAuthenticated, loading, error } = useAuthRouting();
  const { login, loginGoogle, loginMicrosoft, sendOtp, verifyOtp, otpSent, clearStatus } = useAuth();
  
  const [loginMethod, setLoginMethod] = useState('password'); // 'password', 'phone', 'email' (email OTP is hidden but preserved)
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
    formState: { errors },
  } = useForm({
    defaultValues: {
      login: localStorage.getItem('rememberedEmail') || '',
      password: '',
    },
  });

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
    import('react-hot-toast').then(({ toast }) => {
      msalInstance.loginPopup({
        scopes: ['openid', 'profile', 'user.read'],
      })
      .then((response) => {
        if (response && response.idToken) {
          loginMicrosoft(response.idToken);
        }
      })
      .catch((err) => {
        console.error('Microsoft login failed:', err);
        // Automatically recover from MSAL's notoriously sticky interaction_in_progress bug
        if (err.errorCode === 'interaction_in_progress' || (err.message && err.message.includes('interaction_in_progress'))) {
          sessionStorage.clear();
          toast.error('Stuck Microsoft session cleared! Please click the button one more time.');
        } else {
          toast.error(`Microsoft login failed: ${err.message || 'Unknown error'}`);
        }
      });
    });
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
      login({ login: data.login.trim(), password: data.password });
    } else {
      const isEmail = loginMethod === 'email';
      const identifier = loginMethod === 'phone' ? `${countryCode} ${data.login.trim()}` : data.login.trim();
      
      if (!otpSent) {
        await handleSendOtp(identifier, isEmail);
      } else {
        await verifyOtp(identifier, otpCode, isEmail);
      }
    }
  };

  return (
    <div style={styles.container}>
      <CCardGroup style={styles.cardGroup}>
        {/* Left Side: Login Form */}
        <CCard style={styles.leftCard}>
          <CCardBody style={styles.cardBody}>
            <CForm onSubmit={handleSubmit(onSubmit)}>
              <h1 style={styles.title}>{t('auth.login.title', { defaultValue: 'Welcome Back' })}</h1>
              <p style={styles.subtitle}>{t('auth.login.subtitle', { defaultValue: 'Choose your preferred sign-in method.' })}</p>

              <div style={styles.methodToggle}>
                <button
                  type="button"
                  style={loginMethod === 'password' ? styles.methodTabActive : styles.methodTab}
                  onClick={() => { 
                    setLoginMethod('password'); 
                    clearStatus(); 
                    setOtpTimer(0); 
                    setOtpCode(''); 
                    setValue('login', localStorage.getItem('rememberedEmail') || '');
                  }}
                >
                  Email Login
                </button>
                <button
                  type="button"
                  style={loginMethod === 'phone' ? styles.methodTabActive : styles.methodTab}
                  onClick={() => { 
                    setLoginMethod('phone'); 
                    clearStatus(); 
                    setOtpTimer(0); 
                    setOtpCode(''); 
                    setValue('login', '');
                  }}
                >
                  Mobile Login
                </button>
              </div>

              {error && (
                <CAlert color="danger" style={styles.alert}>
                  {error}
                </CAlert>
              )}

              <div className="mb-3">
                <CInputGroup>
                  {loginMethod === 'phone' ? (
                    <>
                      <CInputGroupText style={styles.leftInputIconText}>
                        <CIcon icon={cilScreenSmartphone} style={styles.icon} />
                      </CInputGroupText>
                      <CFormSelect
                        style={styles.countryCodeSelect}
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={loading || otpSent}
                        aria-label="Country Code"
                      >
                        <option value="+1">+1 (US)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+61">+61 (AU)</option>
                        <option value="+971">+971 (AE)</option>
                      </CFormSelect>
                    </>
                  ) : (
                    <CInputGroupText style={styles.leftInputIconText}>
                      <CIcon icon={cilUser} style={styles.icon} />
                    </CInputGroupText>
                  )}
                  <CFormInput
                    style={styles.leftInput}
                    placeholder={
                      loginMethod === 'password' ? t('auth.login.usernamePlaceholder', { defaultValue: 'Email Address' }) :
                      loginMethod === 'email' ? 'Email Address' : 'Mobile Number'
                    }
                    autoComplete="username"
                    disabled={loading || otpSent}
                    autoFocus
                    {...register('login', {
                      required: t('auth.login.loginRequired', { defaultValue: 'Identifier is required.' }),
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
                    <CInputGroupText style={styles.leftInputIconText}>
                      <CIcon icon={cilLockLocked} style={styles.icon} />
                    </CInputGroupText>
                    <CFormInput
                      style={styles.leftInput}
                      type={showPassword ? 'text' : 'password'}
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
                    <CInputGroupText 
                      onClick={() => setShowPassword(!showPassword)} 
                      style={{ cursor: 'pointer', background: '#f3f4f6', border: '1px solid #d1d5db', color: '#6b7280', fontSize: '13px' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
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
                    <CInputGroupText style={styles.leftInputIconText}>OTP</CInputGroupText>
                    <CFormInput
                      style={styles.leftInput}
                      placeholder="Enter 6-digit Code"
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
                      {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Resend OTP'}
                    </CButton>
                  </div>
                </div>
              )}

              {loginMethod === 'password' && (
                <CRow className="mb-3">
                  <CCol xs={6}>
                    <CFormCheck 
                      id="rememberMe" 
                      label="Remember Me" 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)} 
                    />
                  </CCol>
                  <CCol xs={6} className="text-end">
                    <CButton color="link" className="px-0 text-decoration-none" style={styles.forgotLink} onClick={() => setForgotModalVisible(true)}>
                      {t('auth.login.forgotPassword', { defaultValue: 'Forgot password?' })}
                    </CButton>
                  </CCol>
                </CRow>
              )}

              <div className="d-grid mb-1">
                <CButton type="submit" color="primary" style={styles.submitButton} disabled={loading}>
                  {loading ? <CSpinner size="sm" variant="grow" /> : 
                   (loginMethod !== 'password' && !otpSent) ? 'Send OTP' : t('auth.login.submit', { defaultValue: 'Login' })}
                </CButton>
              </div>

              <div style={styles.dividerContainer}>
                <div style={styles.dividerLine}></div>
                <span style={styles.dividerText}>or continue with</span>
                <div style={styles.dividerLine}></div>
              </div>

              <CRow className="g-3 align-items-center justify-content-center">
                <CCol xs={12} sm={6} className="d-flex justify-content-center">
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                      onSuccess={credentialResponse => loginGoogle(credentialResponse.credential)}
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
                    style={styles.ssoButton}
                    disabled={loading}
                  >
                    {/* Official Microsoft 4-square SVG */}
                    <svg style={styles.ssoIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                    Continue with Microsoft
                  </button>
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
      
      <ForgotPasswordModal visible={forgotModalVisible} setVisible={setForgotModalVisible} />

    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '960px',
    margin: '0 auto',
  },
  cardGroup: {
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    borderRadius: '24px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  leftCard: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: 'none',
    padding: '40px 40px',
    color: '#2d3748', // Dark slate for better contrast
    flex: '1 1 50%',
  },
  rightCard: {
    background: 'rgba(155, 202, 248, 0.3)', // Sky blue tint from the background
    border: 'none',
    padding: '40px 32px',
    color: '#1a202c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 40%',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0',
  },
  methodToggle: {
    display: 'flex',
    gap: '0',
    marginBottom: '24px',
    background: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '10px',
    padding: '4px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  methodTab: {
    flex: 1,
    padding: '9px 12px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    background: 'transparent',
    color: '#6b7280',
    borderRadius: '7px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  methodTabActive: {
    flex: 1,
    padding: '9px 12px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    background: '#ffffff',
    color: '#1d4ed8',
    borderRadius: '7px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    transition: 'all 0.2s',
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
    fontWeight: '800',
    color: '#2b6cb0', // Deep blue to match sky theme
    marginBottom: '8px',
    letterSpacing: '-0.025em',
    fontFamily: '"Outfit", "Inter", sans-serif',
  },
  subtitle: {
    color: '#4a5568',
    fontSize: '15px',
    marginBottom: '24px',
    fontFamily: '"Inter", sans-serif',
  },
  leftInputIconText: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRight: 'none',
    color: '#4b5563',
  },
  icon: {
    width: '18px',
    height: '18px',
    color: '#4b5563',
  },
  leftInput: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    color: '#1f2937',
    padding: '12px',
  },
  countryCodeSelect: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    color: '#1f2937',
    padding: '12px 8px',
    maxWidth: '90px',
    borderRight: 'none',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  alert: {
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #4299e1 0%, #2b6cb0 100%)', // Lighter to darker sky blue
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '700',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(43, 108, 176, 0.3)',
    color: '#ffffff',
  },
  forgotLink: {
    color: '#4299e1',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
  },
  rightTitle: {
    fontSize: '28px',
    fontWeight: '800',
    marginBottom: '16px',
    letterSpacing: '-0.025em',
    color: '#2b6cb0', // Matching deep blue
    fontFamily: '"Outfit", "Inter", sans-serif',
  },
  rightText: {
    color: '#2d3748', // Darker text for readability
    fontSize: '15px',
    lineHeight: '1.6',
    marginBottom: '20px',
    fontWeight: '500',
    fontFamily: '"Inter", sans-serif',
  },
  registerButton: {
    background: '#2b6cb0', // Match deep blue theme
    color: '#ffffff',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(43, 108, 176, 0.4)',
    transition: 'all 0.2s',
  },
  dividerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '24px 0 16px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    padding: '0 12px',
    color: '#6b7280',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  ssoButton: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.7)',
    color: '#374151',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '44px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    transition: 'background 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    gap: '10px',
  },
  ssoIcon: {
    width: '20px',
    height: '20px',
    flexShrink: 0,
  },
};

export default LoginForm;
