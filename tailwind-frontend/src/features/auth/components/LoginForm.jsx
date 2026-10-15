import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useAuthRouting from '../hooks/useAuthRouting.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useAuth from '../hooks/useAuth.js';
import { GoogleLogin } from '@react-oauth/google';
import { useMsal } from '@azure/msal-react';
import { useTheme } from 'src/components/provider/theme-provider';
import Logowhite from 'src/assets/images/logos/light-logo.svg';

export const LoginForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { handlePostAuthRedirect, isAuthenticated, loading, error } = useAuthRouting();
  const { login, loginGoogle, loginMicrosoft } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('phone'); // 'phone' | 'email' | 'password'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phone: '',
      login: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      handlePostAuthRedirect();
    }
  }, [isAuthenticated]);

  const { instance: msalInstance } = useMsal();

  const handleMicrosoftLogin = () => {
    msalInstance
      .loginPopup({
        scopes: ['openid', 'profile', 'user.read'],
      })
      .then((response) => {
        if (response && response.idToken) {
          loginMicrosoft(response.idToken);
        }
      })
      .catch((err) => {
        console.error('Microsoft login failed:', err);
      });
  };

  const onSubmit = (data) => {
    const payloadLogin =
      activeTab === 'phone'
        ? (phoneNumber || data.phone || '').trim()
        : activeTab === 'email'
        ? (emailInput || data.login || '').trim()
        : (data.login || '').trim();

    login({ login: payloadLogin, password: data.password || '123456' });
  };

  const toggleMode = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: theme === 'dark' ? '#0A1220' : '#F6F8FC',
        color: theme === 'dark' ? '#FFFFFF' : '#14213D',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
      }}
    >
      {/* LEFT HERO BANNER PANEL (Luxurious Dark Navy Gated Community Banner) */}
      <div className="hidden lg:flex lg:w-7/12 relative flex-col justify-between p-12 overflow-hidden">
        {/* Background Architectural Image with Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(13, 27, 53, 0.85) 0%, rgba(13, 27, 53, 0.94) 100%), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop')`,
          }}
        />

        {/* Top Logo Section */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <img src={Logowhite} alt="NAHOM Logo" className="h-10 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="text-2xl font-extrabold text-white tracking-widest">NAHOM</span>
          </div>
          <p className="text-xs text-[#FF6B00] font-serif italic tracking-widest pl-1">
            Connect Harmony
          </p>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 max-w-xl my-auto py-8">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Gated Community <br />
            Management <span className="text-[#FF6B00]">Platform</span>
          </h1>
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            A smarter, safer and more connected community experience for residents, associations and managers.
          </p>

          {/* 4 Feature Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center flex flex-col items-center hover:bg-white/15 transition-all shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center mb-2.5">
                <Icon icon="solar:shield-keyhole-bold-duotone" width="22" />
              </div>
              <span className="text-xs font-bold text-white leading-tight">Secure Access</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center flex flex-col items-center hover:bg-white/15 transition-all shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center mb-2.5">
                <Icon icon="solar:users-group-two-rounded-bold-duotone" width="22" />
              </div>
              <span className="text-xs font-bold text-white leading-tight">Community Management</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center flex flex-col items-center hover:bg-white/15 transition-all shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center mb-2.5">
                <Icon icon="solar:document-text-bold-duotone" width="22" />
              </div>
              <span className="text-xs font-bold text-white leading-tight">Real-time Insights</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center flex flex-col items-center hover:bg-white/15 transition-all shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center mb-2.5">
                <Icon icon="solar:settings-minimalistic-bold-duotone" width="22" />
              </div>
              <span className="text-xs font-bold text-white leading-tight">Easy Administration</span>
            </div>
          </div>
        </div>

        {/* Bottom Tagline Footer */}
        <div className="relative z-10 flex items-center gap-3 pt-4 border-t border-white/10">
          <div className="w-2 h-8 rounded-full bg-[#FF6B00]"></div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              NAHOM Ecosystem
            </h4>
            <p className="text-xs text-slate-400">
              Nexus Around Home • Smart Enterprise Portal
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIGN IN PANEL */}
      <div className="w-full lg:w-5/12 bg-[#F6F8FC] dark:bg-[#0A1220] flex flex-col justify-between p-6 sm:p-12 relative overflow-y-auto">
        {/* Top Right Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleMode}
            type="button"
            className="w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-800 p-1 flex items-center transition-colors relative cursor-pointer border border-slate-300 dark:border-slate-700"
            aria-label="Toggle Theme"
          >
            <div
              className={`w-4 h-4 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#EA580C] text-white flex items-center justify-center shadow-xs transition-transform transform ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              <Icon
                icon={theme === 'dark' ? 'solar:moon-bold' : 'solar:sun-bold'}
                width="10"
              />
            </div>
          </button>
        </div>

        {/* Form Card */}
        <div className="my-auto max-w-md w-full mx-auto bg-white dark:bg-[#0D1B35] rounded-3xl p-8 shadow-xl border border-[#E5EAF2] dark:border-slate-800">
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-2xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sign in to your NAHOM Admin Portal
            </p>
          </div>

          {/* 2 Login Option Tabs: Email OTP & Mobile OTP */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-white dark:bg-[#0D1B35] text-[#FF6B00] shadow-xs border border-[#FF6B00]/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Email OTP
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('phone')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'phone'
                  ? 'bg-white dark:bg-[#0D1B35] text-[#FF6B00] shadow-xs border border-[#FF6B00]/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Mobile OTP
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 flex items-center gap-2">
              <Icon icon="solar:danger-circle-linear" width="16" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Phone Number Tab Input */}
            {activeTab === 'phone' && (
              <div>
                <div className="relative">
                  <Icon
                    icon="solar:smartphone-linear"
                    width="18"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="phoneInput"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setValue('phone', e.target.value);
                    }}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 border border-[#E5EAF2] dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 text-[#14213D] dark:text-white font-medium transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email OTP Tab Input */}
            {activeTab === 'email' && (
              <div>
                <div className="relative">
                  <Icon
                    icon="solar:letter-linear"
                    width="18"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="emailInput"
                    type="email"
                    placeholder="Enter your email address"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setValue('login', e.target.value);
                    }}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 border border-[#E5EAF2] dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 text-[#14213D] dark:text-white font-medium transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password Tab Inputs */}
            {activeTab === 'password' && (
              <>
                <div>
                  <div className="relative">
                    <Icon
                      icon="solar:letter-linear"
                      width="18"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="login"
                      type="text"
                      placeholder="Enter username or email"
                      disabled={loading}
                      className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 border rounded-2xl focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 text-[#14213D] dark:text-white font-medium transition-all ${
                        errors.login
                          ? 'border-rose-500'
                          : 'border-[#E5EAF2] dark:border-slate-800'
                      }`}
                      {...register('login', {
                        required: 'Username or email is required',
                      })}
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Icon
                      icon="solar:lock-keyhole-linear"
                      width="18"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      disabled={loading}
                      className={`w-full pl-10 pr-10 py-3 text-sm bg-slate-50 dark:bg-slate-900 border rounded-2xl focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 text-[#14213D] dark:text-white font-medium transition-all ${
                        errors.password
                          ? 'border-rose-500'
                          : 'border-[#E5EAF2] dark:border-slate-800'
                      }`}
                      {...register('password', {
                        required: 'Password is required',
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <Icon
                        icon={
                          showPassword
                            ? 'solar:eye-bold'
                            : 'solar:eye-closed-bold'
                        }
                        width="18"
                      />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Remember Me
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#EA580C] text-white font-bold text-sm shadow-lg shadow-[#FF6B00]/25 hover:shadow-xl hover:shadow-[#FF6B00]/35 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
              ) : (
                <>
                  <span>
                    {activeTab === 'phone' || activeTab === 'email'
                      ? 'Send OTP'
                      : 'Sign In'}
                  </span>
                  <Icon icon="solar:alt-arrow-right-linear" width="18" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute w-full border-t border-[#E5EAF2] dark:border-slate-800"></div>
              <span className="relative px-3 bg-white dark:bg-[#0D1B35] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                OR CONTINUE WITH
              </span>
            </div>

            {/* Social Sign In Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                      loginGoogle(credentialResponse.credential);
                    }
                  }}
                  onError={() => {
                    console.error('Google Sign-In failed');
                  }}
                  type="standard"
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="pill"
                  width="180px"
                />
              </div>

              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full py-2.5 px-3 rounded-full border border-[#E5EAF2] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-[#14213D] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Icon icon="ri:apple-fill" width="16" />
                <span>Sign in with Apple</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-6">
          © {new Date().getFullYear()} NAHOM Admin Portal. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
