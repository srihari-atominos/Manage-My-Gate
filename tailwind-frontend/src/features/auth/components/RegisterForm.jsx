import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { User, Lock, Mail, ChevronRight, HelpCircle } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useAuthRouting from '../hooks/useAuthRouting.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useAuth from '../hooks/useAuth.js'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'
import { Button } from 'src/components/ui/button'
import { Alert, AlertDescription } from 'src/components/ui/alert'
import FullLogo from 'src/layouts/full/shared/logo/FullLogo'
import CardBox from 'src/components/shared/CardBox'

/**
 * RegisterForm Component
 * Refactored to support a toggleable "Get Started" view (Login vs Register) using Tailwind CSS.
 * Adheres to the "Thin View" architectural pattern.
 */
export const RegisterForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [isLoginMode, setIsLoginMode] = useState(location.pathname === '/login-createOrg')

  const { loading, error, successMsg, login, register: authRegister, clearStatus } = useAuth()
  const { handlePostAuthRedirect, isAuthenticated } = useAuthRouting()

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
  })

  useEffect(() => {
    clearStatus()
  }, [isLoginMode])

  // Sync mode and form state with the active URL path
  useEffect(() => {
    setIsLoginMode(location.pathname === '/login-createOrg')
    setValue('password', '')
    setValue('confirmPassword', '')
    clearErrors()
  }, [location.pathname])

  // When changing mode, navigate to the correct onboarding route
  const toggleMode = () => {
    if (isLoginMode) {
      navigate('/register')
    } else {
      navigate('/login')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      handlePostAuthRedirect()
    }
  }, [isAuthenticated])

  const onSubmit = (data) => {
    if (isLoginMode) {
      login({ login: data.email.trim(), password: data.password })
    } else {
      // Generate valid alphanumeric username from email prefix to satisfy backend validator
      const emailPrefix = data.email.trim().split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
      let derivedUsername = emailPrefix
      if (derivedUsername.length < 3) {
        derivedUsername = 'user' + Math.floor(100 + Math.random() * 900)
      } else if (derivedUsername.length > 30) {
        derivedUsername = derivedUsername.substring(0, 30)
      }

      authRegister({
        name: data.name.trim(),
        username: derivedUsername,
        email: data.email.trim().toLowerCase(),
        password: data.password,
      }).then((action) => {
        if (action.meta.requestStatus === 'fulfilled') {
          setTimeout(() => {
            navigate('/workspace-setup?intent=create')
          }, 1500)
        }
      })
    }
  }

  return (
    <div className="relative overflow-hidden min-h-screen bg-lightprimary dark:bg-darkprimary py-12">
      <div className="flex min-h-full justify-center items-center px-4">
        <CardBox className="md:w-[480px] w-full border-none bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg">
          <div className="mx-auto mb-6 flex justify-center">
            <FullLogo />
          </div>

          {/* Top Section Info Alert */}
          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex gap-2 items-start">
              <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-black dark:text-white mb-1">
                  {t('auth.register.alertTitle', { defaultValue: 'Why do we need this login?' })}
                </h5>
                <p className="leading-relaxed">
                  {t('auth.register.alertText', {
                    defaultValue:
                      'This login gives you access to the Enterprise Workspace Platform, where you can create and manage your organization securely.',
                  })}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h1 className="text-xl font-bold text-black dark:text-white text-center">
              {isLoginMode
                ? t('auth.register.loginTitle', { defaultValue: 'Log In to Your Account' })
                : t('auth.register.title', { defaultValue: 'Create Your Account' })}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
              {isLoginMode
                ? t('auth.register.loginSubtitle', { defaultValue: 'Access the platform securely' })
                : t('auth.register.subtitle', { defaultValue: 'Create your credentials to get started' })}
            </p>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert className="border-success/20 bg-success/10 text-success">
                <AlertDescription>{successMsg}</AlertDescription>
              </Alert>
            )}

            {/* Full Name */}
            {!isLoginMode && (
              <div>
                <Label htmlFor="name">
                  {t('auth.register.fullNamePlaceholder', { defaultValue: 'Full Name' })}
                </Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    disabled={loading}
                    className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                    {...register('name', {
                      required: !isLoginMode && t('auth.register.nameRequired', { defaultValue: 'Full Name is required.' }),
                    })}
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <Label htmlFor="email">
                {t('auth.register.emailPlaceholder', { defaultValue: 'Email Address' })}
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  disabled={loading}
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  {...register('email', {
                    required: t('auth.register.emailRequired', { defaultValue: 'Email address is required.' }),
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: t('auth.register.emailInvalid', { defaultValue: 'Invalid email address.' }),
                    },
                  })}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">
                {t('auth.register.passwordPlaceholder', { defaultValue: 'Password' })}
              </Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  disabled={loading}
                  className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                  {...register('password', {
                    required: t('auth.register.passwordRequired', { defaultValue: 'Password is required.' }),
                    minLength: {
                      value: 6,
                      message: t('auth.register.passwordLength', { defaultValue: 'Password must be at least 6 characters long.' }),
                    },
                  })}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            {!isLoginMode && (
              <div>
                <Label htmlFor="confirmPassword">
                  {t('auth.register.confirmPasswordPlaceholder', { defaultValue: 'Repeat password' })}
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    disabled={loading}
                    className={`pl-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    {...register('confirmPassword', {
                      required: !isLoginMode && t('auth.register.confirmPasswordRequired', { defaultValue: 'Please repeat your password.' }),
                      validate: (value, formValues) =>
                        isLoginMode || value === formValues.password || t('auth.register.passwordsMustMatch', { defaultValue: 'Passwords do not match.' }),
                    })}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-4 bg-success hover:bg-success/90 text-white">
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
              ) : isLoginMode ? (
                t('auth.register.loginSubmit', { defaultValue: 'Log In' })
              ) : (
                t('auth.register.submit', { defaultValue: 'Create Account' })
              )}
            </Button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={toggleMode}
                className="text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                {isLoginMode
                  ? t('auth.register.signUpLink', { defaultValue: "Don't have an account? Sign Up" })
                  : t('auth.register.loginLink', { defaultValue: 'Already have an account? Login' })}
              </button>
            </div>
          </form>
        </CardBox>
      </div>
    </div>
  )
}

export default RegisterForm
