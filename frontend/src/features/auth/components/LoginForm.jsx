import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import CIcon from '@coreui/icons-react'
import {
  cilLockLocked,
  cilUser,
  cilScreenSmartphone,
  cilShieldAlt,
  cilEnvelopeClosed,
  cilPeople,
  cilChartLine,
  cilSettings,
  cilCheckCircle,
  cilWarning,
  cilArrowRight,
  cilSun,
  cilMoon,
} from '@coreui/icons'
import useAuthRouting from '../hooks/useAuthRouting.js'
import useAuth from '../hooks/useAuth.js'
import { loginWithGoogle } from '../store/authSlice.js'
import { GoogleLogin } from '@react-oauth/google'
import { useMsal } from '@azure/msal-react'
import { toast } from 'react-hot-toast'

import nahomLogo from '../../../assets/images/nahom_full_logo.png'
import nahomEmblem from '../../../assets/images/nahom_emblem.png'

const MemoizedGoogleLogin = React.memo(({ onSuccess, onError }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const isDummy = !clientId || clientId === 'dummy-client-id'

  if (isDummy) {
    return (
      <button
        type="button"
        onClick={() => toast.error('Google Sign-In requires a valid VITE_GOOGLE_CLIENT_ID in .env')}
        style={{
          width: '100%',
          height: '40px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 700,
          color: '#14213D',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxSizing: 'border-box',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Google</span>
      </button>
    )
  }

  return (
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      type="standard"
      theme="outline"
      size="large"
      width="190"
    />
  )
})
MemoizedGoogleLogin.displayName = 'MemoizedGoogleLogin'

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

  const [loginMethod, setLoginMethod] = useState('phone') // 'phone', 'email', 'NONE' (password)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emailValue, setEmailValue] = useState(emailParam || localStorage.getItem('rememberedEmail') || '')
  const [passwordValue, setPasswordValue] = useState(passwordParam || '')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberedEmail') !== null)
  const [otpCode, setOtpCode] = useState('')
  const [otpTimer, setOtpTimer] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const {
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phone: '',
      login: emailParam || localStorage.getItem('rememberedEmail') || '',
      password: passwordParam || '',
    },
  })

  useEffect(() => {
    if (isAuthenticated) handlePostAuthRedirect()
  }, [isAuthenticated])

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
          handlePostAuthRedirect({ skipInviteToken: true })
        }
      } catch (err) {
        toast.error(err?.message || 'Failed to verify Google account')
      }
    },
    [dispatch, inviteTokenParam, navigate, handlePostAuthRedirect],
  )

  const handleGoogleError = useCallback(() => {
    toast.error('Google Sign-In failed')
  }, [])

  const { instance: msalInstanceObj } = useMsal()

  const handleMicrosoftLogin = () => {
    msalInstanceObj
      .loginPopup({
        scopes: ['openid', 'profile', 'user.read'],
      })
      .then(async (response) => {
        if (!response || (!response.idToken && !response.accessToken)) {
          toast.error('MSAL authentication response empty')
          return
        }
        const tokenToUse = response.idToken || response.accessToken
        const res = await loginMicrosoft(tokenToUse, inviteTokenParam)
        if (!res.success) {
          toast.error(res.error?.message || 'Microsoft login failed')
        }
      })
      .catch((err) => {
        console.error('Microsoft login failed:', err)
        toast.error('Microsoft login error')
      })
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
    if (loginMethod === 'NONE') {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', (data.login || emailValue).trim())
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      try {
        const res = await login({
          login: (data.login || emailValue).trim(),
          password: data.password || passwordValue,
          inviteToken: inviteTokenParam || undefined,
        })

        if (res?.success) {
          handlePostAuthRedirect()
        } else if (res?.error) {
          const errMsg = typeof res.error === 'string' ? res.error : res.error?.message || 'Login failed'
          setError('login', { type: 'server', message: errMsg })
        }
      } catch (err) {
        setError('login', { type: 'server', message: err?.message || 'An unexpected error occurred' })
      }
    } else {
      const isEmail = loginMethod === 'email'
      const rawPhone = phoneNumber.replace(/[^0-9]/g, '')
      const identifier =
        loginMethod === 'phone' ? `+${rawPhone || (data.phone || '').trim()}` : (emailValue || data.login || '').trim()

      if (!otpSent) {
        await handleSendOtp(identifier, isEmail)
      } else {
        const res = await verifyOtp(identifier, otpCode, isEmail, inviteTokenParam || undefined)
        if (res?.success) {
          handlePostAuthRedirect()
        }
      }
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#0A1220' : '#F6F8FC',
        color: isDarkMode ? '#FFFFFF' : '#14213D',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
      }}
    >
      {/* LEFT HERO BANNER PANEL (Reference Image 2 - 50% width) */}
      <div
        style={{
          width: '50%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 48px',
          backgroundColor: '#0D1B35',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Background Architectural Image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(180deg, rgba(13, 27, 53, 0.82) 0%, rgba(13, 27, 53, 0.94) 100%), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />

        {/* Top Logo & Tagline */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={nahomEmblem} alt="NAHOM" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '3px', lineHeight: 1 }}>
              NAHOM
            </span>
          </div>
          <p style={{ margin: '4px 0 0 4px', fontSize: '11px', color: '#FF6B00', fontFamily: 'serif', fontStyle: 'italic', letterSpacing: '2px' }}>
            Connect Harmony
          </p>
        </div>

        {/* Center Content */}
        <div style={{ position: 'relative', zIndex: 10, margin: 'auto 0', maxWidth: '520px' }}>
          <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#FFFFFF', lineHeight: '1.2', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Gated Community <br />
            Management <span style={{ color: '#FF6B00' }}>Platform</span>
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
            A smarter, safer and more connected community experience for residents, associations and managers.
          </p>

          {/* 4 Feature Glass Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '16px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.2)', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <CIcon icon={cilShieldAlt} size="lg" />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>Secure Access</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '16px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.2)', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <CIcon icon={cilPeople} size="lg" />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>Community Management</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '16px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.2)', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <CIcon icon={cilChartLine} size="lg" />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>Real-time Insights</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', padding: '16px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.2)', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <CIcon icon={cilSettings} size="lg" />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>Easy Administration</span>
            </div>
          </div>
        </div>

        {/* Bottom Gate Entrance Branding Footer */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '4px', backgroundColor: '#FF6B00' }}></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '1px' }}>
                NAHOM Ecosystem
              </h4>
              <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>
                Nexus Around Home • Smart Enterprise Portal
              </p>
            </div>
          </div>
          <img src={nahomEmblem} alt="NAHOM Emblem" style={{ height: '32px', width: 'auto', opacity: 0.7 }} />
        </div>
      </div>

      {/* RIGHT SIGN IN PANEL (50% width) */}
      <div
        style={{
          width: '50%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 48px',
          position: 'relative',
          overflowY: 'auto',
          backgroundColor: isDarkMode ? '#0D1B35' : '#F6F8FC',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Right Theme Toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              width: '48px',
              height: '26px',
              borderRadius: '13px',
              backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0',
              padding: '3px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Toggle Theme"
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isDarkMode ? 'translateX(22px)' : 'translateX(0)',
                transition: 'transform 0.2s ease',
              }}
            >
              <CIcon icon={isDarkMode ? cilMoon : cilSun} size="sm" />
            </div>
          </button>
        </div>

        {/* Form Card */}
        <div
          style={{
            margin: 'auto',
            maxWidth: '440px',
            width: '100%',
            backgroundColor: isDarkMode ? '#172B70' : '#FFFFFF',
            borderRadius: '24px',
            padding: '36px 32px',
            boxShadow: '0 20px 40px -15px rgba(13, 27, 53, 0.1)',
            border: isDarkMode ? '1px solid #1E293B' : '1px solid #E5EAF2',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: isDarkMode ? '#FFF' : '#14213D', margin: 0 }}>
              Welcome Back
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', marginBottom: 0 }}>
              Sign in to your NAHOM Admin Portal
            </p>
          </div>

          {/* 2 Login Option Tabs: Email OTP & Mobile OTP */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              backgroundColor: isDarkMode ? '#0D1B35' : '#F1F5F9',
              borderRadius: '16px',
              marginBottom: '24px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setLoginMethod('email')
                clearStatus()
                setOtpCode('')
                clearErrors()
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                border: loginMethod === 'email' ? '1px solid #FF6B00' : 'none',
                backgroundColor: loginMethod === 'email' ? (isDarkMode ? '#0D1B35' : '#FFFFFF') : 'transparent',
                color: loginMethod === 'email' ? '#FF6B00' : '#64748B',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <CIcon icon={cilEnvelopeClosed} size="sm" />
              <span>Email OTP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMethod('phone')
                clearStatus()
                setOtpCode('')
                clearErrors()
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                border: loginMethod === 'phone' ? '1px solid #FF6B00' : 'none',
                backgroundColor: loginMethod === 'phone' ? (isDarkMode ? '#0D1B35' : '#FFFFFF') : 'transparent',
                color: loginMethod === 'phone' ? '#FF6B00' : '#64748B',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <CIcon icon={cilScreenSmartphone} size="sm" />
              <span>Mobile OTP</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CIcon icon={cilWarning} size="sm" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email OTP Login Input */}
            {loginMethod === 'email' && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '14px', color: '#94A3B8', display: 'flex' }}>
                  <CIcon icon={cilEnvelopeClosed} size="sm" />
                </span>
                <input
                  id="login"
                  name="login"
                  type="email"
                  placeholder="Enter your email address"
                  value={emailValue}
                  onChange={(e) => {
                    setEmailValue(e.target.value)
                    setValue('login', e.target.value)
                  }}
                  disabled={loading || otpSent}
                  autoFocus
                  style={{
                    width: '100%',
                    paddingLeft: '42px',
                    paddingRight: '14px',
                    height: '46px',
                    fontSize: '13px',
                    backgroundColor: isDarkMode ? '#0D1B35' : '#F8FAFC',
                    border: isDarkMode ? '1px solid #1E293B' : '1px solid #E2E8F0',
                    borderRadius: '12px',
                    color: isDarkMode ? '#FFF' : '#14213D',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Mobile OTP Login Input */}
            {loginMethod === 'phone' && (
              <div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '14px', color: '#94A3B8', display: 'flex' }}>
                    <CIcon icon={cilScreenSmartphone} size="sm" />
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value)
                      setValue('phone', e.target.value)
                    }}
                    disabled={loading || otpSent}
                    autoFocus
                    style={{
                      width: '100%',
                      paddingLeft: '42px',
                      paddingRight: '14px',
                      height: '46px',
                      fontSize: '13px',
                      backgroundColor: isDarkMode ? '#0D1B35' : '#F8FAFC',
                      border: isDarkMode ? '1px solid #1E293B' : '1px solid #E2E8F0',
                      borderRadius: '12px',
                      color: isDarkMode ? '#FFF' : '#14213D',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            {/* OTP Code Input */}
            {otpSent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Enter 4-digit OTP code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  disabled={loading}
                  maxLength={4}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    letterSpacing: '6px',
                    fontWeight: 800,
                    height: '46px',
                    fontSize: '16px',
                    backgroundColor: isDarkMode ? '#0D1B35' : '#F8FAFC',
                    border: '1px solid #FF6B00',
                    borderRadius: '12px',
                    color: isDarkMode ? '#FFF' : '#14213D',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    disabled={loading || otpTimer > 0}
                    onClick={() => {
                      const rawPhone = phoneNumber.replace(/[^0-9]/g, '')
                      const identifier = loginMethod === 'phone' ? `+${rawPhone}` : emailValue
                      handleSendOtp(identifier, false)
                    }}
                    style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, color: '#FF6B00', cursor: 'pointer' }}
                  >
                    {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me */}
            <div style={{ display: 'flex', itemsCenter: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#FF6B00', width: '15px', height: '15px' }}
                />
                <span style={{ fontSize: '12px', color: '#64748B' }}>Remember Me</span>
              </label>
            </div>

            {/* Main Action Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(90deg, #FF6B00 0%, #EA580C 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(255, 107, 0, 0.4)',
              }}
            >
              <span>
                {loginMethod === 'email' ? 'Sign In' : !otpSent ? 'Send OTP' : 'Verify & Sign In'}
              </span>
              <CIcon icon={cilArrowRight} size="sm" />
            </button>

            {/* Divider */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0 8px' }}>
              <div style={{ position: 'absolute', width: '100%', borderTop: '1px solid #E2E8F0' }} />
              <span style={{ position: 'relative', padding: '0 12px', backgroundColor: isDarkMode ? '#172B70' : '#FFFFFF', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94A3B8' }}>
                OR CONTINUE WITH
              </span>
            </div>

            {/* Social Buttons: Google & Microsoft */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Google Button */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <MemoizedGoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
              </div>

              {/* Microsoft Button with Microsoft 4-color icon */}
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: isDarkMode ? '#0D1B35' : '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDarkMode ? '#FFF' : '#14213D',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxSizing: 'border-box',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                <span>Microsoft</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', paddingTop: '16px' }}>
          © {new Date().getFullYear()} NAHOM Admin Portal. All rights reserved.
        </div>
      </div>
    </div>
  )
}

export default LoginForm
