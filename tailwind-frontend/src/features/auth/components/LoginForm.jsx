import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useAuthRouting from '../hooks/useAuthRouting.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import useAuth from '../hooks/useAuth.js';
import { GoogleLogin } from '@react-oauth/google';
import { useMsal } from '@azure/msal-react';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Button } from 'src/components/ui/button';
import { Alert, AlertDescription } from 'src/components/ui/alert';
import FullLogo from 'src/layouts/full/shared/logo/FullLogo';
import CardBox from 'src/components/shared/CardBox';

export const LoginForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { handlePostAuthRedirect, isAuthenticated, loading, error } = useAuthRouting();
  const { login, loginGoogle, loginMicrosoft } = useAuth();

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

  useEffect(() => {
    if (isAuthenticated) {
      handlePostAuthRedirect();
    }
  }, [isAuthenticated]);

  const { instance: msalInstance } = useMsal();

  const handleMicrosoftLogin = () => {
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
    });
  };

  const onSubmit = (data) => {
    login({ login: data.login.trim(), password: data.password });
  };

  return (
    <div className="relative overflow-hidden h-screen bg-lightprimary dark:bg-darkprimary">
      <div className="flex h-full justify-center items-center px-4">
        <CardBox className="md:w-[450px] w-full border-none bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark rounded-lg">
          <div className="mx-auto mb-6 flex justify-center">
            <FullLogo />
          </div>

          <h2 className="text-xl font-bold text-black dark:text-white text-center mb-1">
            {t('auth.login.title', { defaultValue: 'Login' })}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            {t('auth.login.subtitle', { defaultValue: 'Sign In to your enterprise account' })}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="login">
                {t('auth.login.usernamePlaceholder', { defaultValue: 'Username or Email' })}
              </Label>
              <Input
                id="login"
                type="text"
                placeholder="Username or Email"
                disabled={loading}
                className={`mt-1.5 ${errors.login ? 'border-red-500' : ''}`}
                {...register('login', {
                  required: t('auth.validation.loginRequired', { defaultValue: 'Username or email is required' }),
                })}
              />
              {errors.login && (
                <p className="text-red-500 text-xs mt-1">{errors.login.message}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password">
                  {t('auth.login.passwordPlaceholder', { defaultValue: 'Password' })}
                </Label>
                <Link to="/forgot-password" className="text-primary text-xs font-medium hover:underline">
                  {t('auth.login.forgotPassword', { defaultValue: 'Forgot password?' })}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={loading}
                className={`mt-1.5 ${errors.password ? 'border-red-500' : ''}`}
                {...register('password', {
                  required: t('auth.validation.passwordRequired', { defaultValue: 'Password is required' }),
                })}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
              ) : (
                t('auth.login.submit', { defaultValue: 'Login' })
              )}
            </Button>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute w-full border-t border-stroke dark:border-strokedark"></div>
              <span className="relative px-3 bg-white dark:bg-boxdark text-xs text-gray-500 dark:text-gray-400">
                {t('auth.login.orSignInWith', { defaultValue: 'Or Sign In with' })}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
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
                  width="200px"
                />
              </div>
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded border border-stroke dark:border-strokedark py-2 px-3 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-meta-4/20 cursor-pointer disabled:opacity-50"
              >
                <span className="text-blue-600 font-bold">❖</span>
                {t('auth.login.microsoft', { defaultValue: 'Microsoft' })}
              </button>
            </div>

            <div className="flex gap-2 text-sm text-ld font-medium mt-6 items-center justify-center">
              <p>{t('auth.login.newToApp', { defaultValue: 'New here?' })}</p>
              <Link to="/register" className="text-primary font-semibold hover:underline">
                {t('auth.login.registerNow', { defaultValue: 'Register Now!' })}
              </Link>
            </div>
          </form>
        </CardBox>
      </div>
    </div>
  );
};

export default LoginForm;
