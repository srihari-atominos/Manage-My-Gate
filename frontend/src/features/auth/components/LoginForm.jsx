import React, { useEffect, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import useAuthRouting from '../hooks/useAuthRouting.js'
import useAuth from '../hooks/useAuth.js'
import { loginWithGoogle } from '../store/authSlice.js'
import ForgotPasswordModal from './ForgotPasswordModal.jsx'
import { GoogleLogin } from '@react-oauth/google'
import { useMsal } from '@azure/msal-react'

const MemoizedGoogleLogin = React.memo(({ onSuccess, onError }) => (
  <GoogleLogin
    onSuccess={onSuccess}
    onError={onError}
    type="standard"
    theme="outline"
    size="large"
    width="220px"
  />
))
MemoizedGoogleLogin.displayName = 'MemoizedGoogleLogin'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { toast } from 'react-hot-toast'
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilScreenSmartphone } from '@coreui/icons'
import '../styles/_auth.scss'

/**
 * LoginFormErrorBoundary Component
 * Isolates runtime UI crashes in the LoginForm.
 */
class LoginFormErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('LoginForm Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-error-boundary-container p-4 text-center">
          <h3 className="text-danger">Something went wrong.</h3>
          <p>Please try reloading the page.</p>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Standard Login Form component.
 * Features username/email & password inputs and basic validation.
 * Adheres to the "Thin View" architectural pattern.
 */
export const LoginForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const { handlePostAuthRedirect, isAuthenticated, loading, error } = useAuthRouting()
  const { login, loginMicrosoft, sendOtp, verifyOtp, otpSent, clearStatus } = useAuth()

  const location = useLocation()

  const inviteTokenParam = searchParams.get('invite_token')
  const emailParam = searchParams.get('email') || location.state?.email || ''
  const passwordParam = searchParams.get('password') || location.state?.password || ''

  const [expectedPhoneLength, setExpectedPhoneLength] = useState(12) // Default for India (91 + 10 digits)

  const [loginMethod, setLoginMethod] = useState('password') // 'password', 'phone', 'email'
  const [forgotModalVisible, setForgotModalVisible] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberedEmail') !== null)
  const [countryCode, setCountryCode] = useState('+91')
  const [otpTimer, setOtpTimer] = useState(0)

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      login: emailParam || localStorage.getItem('rememberedEmail') || '',
      password: passwordParam || '',
    },
  })

  // Explicitly force the values into the form fields after mount.
  // CoreUI components sometimes ignore react-hook-form's defaultValues on initial render, 
  // so we apply a multi-layered approach to guarantee they appear.
  useEffect(() => {
    const loginVal = emailParam || localStorage.getItem('rememberedEmail') || ''
    const passVal = passwordParam || ''
    
    if (loginVal || passVal) {
      reset({ login: loginVal, password: passVal })
      if (emailParam) setLoginMethod('password')

      // Brute-force fallback for UI visual sync
      setTimeout(() => {
        setValue('login', loginVal, { shouldValidate: true })
        setValue('password', passVal, { shouldValidate: true })
        
        const loginInput = document.querySelector('input[name="login"]')
        const passInput = document.querySelector('input[name="password"]')
        if (loginInput && loginVal) loginInput.value = loginVal
        if (passInput && passVal) passInput.value = passVal
      }, 50)
    }
  }, [emailParam, passwordParam, reset, setValue])

  // Automatically handle routing updates post-authentication
  useEffect(() => {
    if (isAuthenticated) {
      handlePostAuthRedirect()
    }
  }, [isAuthenticated])

  // Handle OTP countdown timer
  useEffect(() => {
    let interval = null
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [otpTimer])

  const { instance: msalInstance } = useMsal()

  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      try {
        const response = await dispatch(
          loginWithGoogle({ token: credentialResponse.credential, inviteToken: inviteTokenParam }),
        ).unwrap()

        if (response.data?.isNewUser) {
          navigate('/register', {
            state: {
              email: response.data.googleData.email,
              name: response.data.googleData.name,
              isGoogleSso: true,
            },
          })
        } else {
          handlePostAuthRedirect()
        }
      } catch (err) {
        toast.error(err || 'Failed to verify Google account')
      }
    },
    [dispatch, inviteTokenParam, navigate, handlePostAuthRedirect],
  )

  const handleGoogleError = useCallback(() => {
    toast.error('Google Sign-In failed')
  }, [])

  const handleMicrosoftLogin = () => {
    let retries = 0
    const triggerLogin = () => {
      msalInstance
        .loginPopup({
          scopes: ['openid', 'profile', 'user.read'],
        })
        .then((response) => {
          if (response && response.idToken) {
            loginMicrosoft(response.idToken, inviteTokenParam)
          }
        })
        .catch((err) => {
          console.error('Microsoft login failed:', err)
          // Automatically recover from MSAL's notoriously sticky interaction_in_progress bug
          if (
            (err.errorCode === 'interaction_in_progress' ||
              (err.message && err.message.includes('interaction_in_progress'))) &&
            retries < 3
          ) {
            retries++
            sessionStorage.clear()
            triggerLogin()
          } else {
            toast.error(
              t('auth.login.msalFailed', 'Microsoft login failed: {{error}}', {
                error: err.message || 'Unknown error',
              }),
            )
          }
        })
    }

    triggerLogin()
  }

  const handleSendOtp = async (identifier, isEmail) => {
    const resultAction = await sendOtp(identifier, isEmail)
    if (resultAction.meta.requestStatus === 'fulfilled') {
      setOtpTimer(60)
      toast.success(t('auth.login.otpSent', 'OTP sent successfully!'))
    } else {
      toast.error(resultAction.payload || t('auth.login.otpFailed', 'Failed to send OTP'))
    }
  }

  const onSubmit = async (data) => {
    if (loginMethod === 'password') {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', data.login.trim())
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      
      try {
        const res = await login({
          login: data.login.trim(),
          password: data.password,
          inviteToken: inviteTokenParam || undefined,
        })
        
        if (res?.success) {
          handlePostAuthRedirect()
        } else if (res?.error) {
          const backendErrorMessage = typeof res.error === 'string' ? res.error : (res.error?.message || 'Login failed')
          const lowerError = backendErrorMessage.toLowerCase()
          
          if (lowerError.includes('not found') || lowerError.includes('invalid') || lowerError.includes('credential')) {
            setError('login', { type: 'server', message: backendErrorMessage })
          }
        }
      } catch (err) {
        setError('login', { type: 'server', message: err?.message || 'An unexpected error occurred' })
      }
    } else {
      const isEmail = loginMethod === 'email'
      const identifier =
        loginMethod === 'phone' ? `+${(data.phone || '').trim()}` : (data.login || '').trim()

      if (!otpSent) {
        await handleSendOtp(identifier, isEmail)
      } else {
        const res = await verifyOtp(identifier, otpCode, isEmail)
        if (res?.success) {
          handlePostAuthRedirect()
        }
      }
    }
  }

  return (
    <div className="login-container">
      <CCardGroup className="login-card-group">
        {/* Left Side: Login Form */}
        <CCard className="login-left-card">
          <CCardBody className="login-card-body">
            <CForm onSubmit={handleSubmit(onSubmit)}>
              {/* Fake fields to intercept Chrome's aggressive autofill */}
              <input type="text" name="fakeusernameremembered" style={{ opacity: 0, position: 'absolute', zIndex: -1, width: 0, height: 0 }} tabIndex="-1" aria-hidden="true" autoComplete="off" />
              <input type="password" name="fakepasswordremembered" style={{ opacity: 0, position: 'absolute', zIndex: -1, width: 0, height: 0 }} tabIndex="-1" aria-hidden="true" autoComplete="new-password" />

              <h1 className="login-title">{t('auth.login.title', 'Welcome Back')}</h1>
              <p className="login-subtitle">
                {t('auth.login.subtitle', 'Choose your preferred sign-in method.')}
              </p>

              <div className="login-method-toggle">
                <button
                  type="button"
                  className={`login-method-tab ${loginMethod === 'password' ? 'active' : ''}`}
                  onClick={() => {
                    setLoginMethod('password')
                    clearStatus()
                    setOtpTimer(0)
                    setOtpCode('')
                    setValue('login', localStorage.getItem('rememberedEmail') || '')
                    setValue('phone', '')
                    clearErrors()
                  }}
                >
                  {t('auth.login.passwordTab', 'Password Login')}
                </button>
                <button
                  type="button"
                  className={`login-method-tab ${loginMethod === 'phone' ? 'active' : ''}`}
                  onClick={() => {
                    setLoginMethod('phone')
                    clearStatus()
                    setOtpTimer(0)
                    setOtpCode('')
                    setValue('login', '')
                    setValue('phone', '')
                    clearErrors()
                  }}
                >
                  {t('auth.login.mobileTab', 'Mobile Login')}
                </button>
                <button
                  type="button"
                  className={`login-method-tab ${loginMethod === 'email' ? 'active' : ''}`}
                  onClick={() => {
                    setLoginMethod('email')
                    clearStatus()
                    setOtpTimer(0)
                    setOtpCode('')
                    setValue('login', '')
                    setValue('phone', '')
                    clearErrors()
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
                {loginMethod === 'phone' ? (
                  <>
                    <Controller
                      name="phone"
                      control={control}
                      rules={{
                        required: t('auth.login.phoneRequired', 'Phone number is required.'),
                        validate: (value) => {
                          if (!value) return true
                          if (value.length < expectedPhoneLength) {
                            return t(
                              'auth.login.phoneInvalid',
                              'Invalid phone number length for this country.',
                            )
                          }
                          return true
                        },
                      }}
                      render={({ field: { onChange, value } }) => (
                        <PhoneInput
                          country={'in'}
                          value={value}
                          onChange={(phone, country) => {
                            if (country && country.format) {
                              setExpectedPhoneLength(country.format.replace(/[^.]/g, '').length)
                            }
                            onChange(phone)
                          }}
                          containerStyle={{
                            width: '100%',
                          }}
                          inputStyle={{
                            width: '100%',
                            height: '42px',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '14px',
                          }}
                          buttonStyle={{
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem 0 0 0.375rem',
                            backgroundColor: '#f3f4f6',
                          }}
                          disabled={loading || otpSent}
                        />
                      )}
                    />
                    {errors.phone && (
                      <div className="text-danger small mt-1 ms-1">{errors.phone.message}</div>
                    )}
                  </>
                ) : (
                  <>
                    <CInputGroup>
                      <CInputGroupText className="login-input-icon-text">
                        <CIcon icon={cilUser} className="login-icon" />
                      </CInputGroupText>
                      <CFormInput
                        className="login-input"
                        placeholder={
                          loginMethod === 'password'
                            ? t('auth.login.usernamePlaceholder', 'Email Address')
                            : t('auth.login.emailPlaceholder', 'Email Address')
                        }
                        autoComplete="off"
                        disabled={loading || otpSent}
                        autoFocus
                        maxLength={255}
                        {...register('login', {
                          required: t('auth.login.loginRequired', 'Email is required.'),
                          maxLength: {
                            value: 255,
                            message: t('auth.login.emailMaxLength', 'Email cannot exceed 255 characters'),
                          },
                          pattern: {
                            value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                            message: t('auth.login.emailInvalidFormat', 'Please enter a valid email address format'),
                          },
                        })}
                      />
                    </CInputGroup>
                    {errors.login && (
                      <div className="text-danger small mt-1 ms-1">{errors.login.message}</div>
                    )}
                  </>
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
                      autoComplete="new-password"
                      disabled={loading}
                      {...register('password', {
                        required:
                          loginMethod === 'password'
                            ? t('auth.login.passwordRequired', 'Password is required.')
                            : false,
                        minLength:
                          loginMethod === 'password'
                            ? {
                                value: 6,
                                message: t(
                                  'auth.login.passwordLength',
                                  'Password must be at least 6 characters long.',
                                ),
                              }
                            : undefined,
                      })}
                    />
                    <CInputGroupText
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        cursor: 'pointer',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        color: '#6b7280',
                        fontSize: '13px',
                      }}
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
                        const isEmail = loginMethod === 'email'
                        const identifier =
                          loginMethod === 'phone'
                            ? `+${(watch('phone') || '').trim()}`
                            : (watch('login') || '').trim()
                        handleSendOtp(identifier, isEmail)
                      }}
                    >
                      {otpTimer > 0
                        ? `${t('auth.login.resendOtpIn', 'Resend OTP in')} ${otpTimer}s`
                        : t('auth.login.resendOtp', 'Resend OTP')}
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
                    <CButton
                      color="link"
                      className="px-0 text-decoration-none login-forgot-link"
                      onClick={() => setForgotModalVisible(true)}
                    >
                      {t('auth.login.forgotPassword', 'Forgot password?')}
                    </CButton>
                  </CCol>
                </CRow>
              )}

              <div className="d-grid mb-1">
                <CButton
                  type="submit"
                  color="primary"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <CSpinner size="sm" variant="grow" />
                  ) : loginMethod !== 'password' && !otpSent ? (
                    t('auth.login.sendOtp', 'Send OTP')
                  ) : (
                    t('auth.login.submit', 'Login')
                  )}
                </CButton>
              </div>

              <div className="login-divider">
                <div className="login-divider-line"></div>
                <span className="login-divider-text">
                  {t('auth.login.orContinueWith', 'or continue with')}
                </span>
                <div className="login-divider-line"></div>
              </div>

              <CRow className="g-3 align-items-center justify-content-center">
                <CCol xs={12} sm={6} className="d-flex justify-content-center">
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <MemoizedGoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
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
                    <svg
                      className="login-sso-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 23 23"
                    >
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
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
              <h2 className="login-right-title">
                {t('auth.login.promoTitle', 'Enterprise Workspace Platform')}
              </h2>
              <p className="login-right-text">
                {t(
                  'auth.login.promoText',
                  'Access your secure organization workspace, manage team privileges, configure third-party API integrations, and view full audit records in one unified dashboard.',
                )}
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
  )
}

export default function LoginFormWithBoundary(props) {
  return (
    <LoginFormErrorBoundary>
      <LoginForm {...props} />
    </LoginFormErrorBoundary>
  )
}
