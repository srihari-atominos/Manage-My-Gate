import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import AppLoader from '../../../components/common/AppLoader';
import { useAuth } from '../../../features/auth/hooks/useAuth';

export default function InviteHandler() {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const token = routeToken || searchParams.get('token') || '';
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const currentUser = useSelector((state) => state.auth.user);
  const { handleAcceptInvitation, logout } = useAuth();

  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAttemptingDeepLink, setIsAttemptingDeepLink] = useState(false);

  // Mobile device detection
  const isIos =
    typeof navigator !== 'undefined' &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent || '') ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
  const isMobile = isIos || isAndroid;

  const playStoreUrl = `https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom&referrer=${encodeURIComponent(`token=${token}`)}`;
  const appStoreUrl = 'https://apps.apple.com/app/manage-my-gate/id6746501635';
  const customDeepLink = `managemygate://invite/${token}`;
  const storeUrl = isAndroid ? playStoreUrl : appStoreUrl;

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    // 1. Mobile handling for unauthenticated users
    if (!isAuthenticated) {
      if (isMobile) {
        setStatus('mobile_prompt');
        // Automatically attempt to launch installed app via deep link
        try {
          setIsAttemptingDeepLink(true);
          window.location.href = customDeepLink;
        } catch (_) {}
        return;
      }

      // Desktop: route straight to web login preserving token
      navigate(`/login?invite_token=${encodeURIComponent(token)}`, { replace: true });
      return;
    }

    // 2. Authenticated user handling
    let isMounted = true;

    const acceptInviteAsync = async () => {
      try {
        const result = await handleAcceptInvitation(token);
        if (!isMounted) return;

        if (result?.success) {
          navigate('/dashboard', { replace: true });
        } else {
          const err = result?.error;
          const isMismatch =
            typeof err === 'string' &&
            (err.toLowerCase().includes('different account') || err.toLowerCase().includes('mismatch'));
          const isAlreadyAccepted =
            typeof err === 'string' &&
            (err.toLowerCase().includes('already been accepted') ||
              err.toLowerCase().includes('already accepted') ||
              err.toLowerCase().includes('already a member') ||
              err.toLowerCase().includes('already active'));

          if (isMismatch) {
            setStatus('mismatch');
            setErrorMessage(err);
          } else if (isAlreadyAccepted) {
            // Already active in this community (e.g. accepted during OTP verification)
            toast.success(t('auth.invite.acceptedSuccess', 'Invitation accepted! Welcome to the community.'));
            navigate('/dashboard', { replace: true });
          } else {
            toast.error(err || t('auth.invite.error', 'Unable to accept invitation.'));
            setStatus('error');
            setErrorMessage(err || 'Unable to accept invitation.');
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (e) {
        if (!isMounted) return;
        const msg = e?.message || '';
        const isAlreadyAccepted =
          msg.toLowerCase().includes('already accepted') ||
          msg.toLowerCase().includes('already been accepted') ||
          msg.toLowerCase().includes('already a member') ||
          msg.toLowerCase().includes('already active');

        if (isAlreadyAccepted) {
          navigate('/dashboard', { replace: true });
        } else {
          toast.error(e?.message || t('auth.invite.error', 'Failed to accept invitation.'));
          setStatus('error');
          setErrorMessage(e?.message || 'Failed to accept invitation.');
          navigate('/dashboard', { replace: true });
        }
      }
    };

    acceptInviteAsync();

    return () => {
      isMounted = false;
    };
  }, [token, isAuthenticated, isMobile]);

  const handleLogoutAndSwitch = async () => {
    await logout();
    navigate(`/login?invite_token=${encodeURIComponent(token)}`, { replace: true });
  };

  const handleContinueCurrent = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleContinueInWeb = () => {
    navigate(`/login?invite_token=${encodeURIComponent(token)}`, { replace: true });
  };

  const handleLaunchApp = () => {
    window.location.href = customDeepLink;
  };

  const handleOpenStore = () => {
    window.location.href = storeUrl;
  };

  // Render Mobile Gateway Screen
  if (status === 'mobile_prompt') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          backgroundColor: '#0D1B35',
          color: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '36px 24px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: 'rgba(244, 90, 10, 0.15)',
              border: '1px solid rgba(244, 90, 10, 0.3)',
              color: '#F45A0A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '32px',
            }}
          >
            🏢
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>
            {t('auth.invite.stepIntoCommunity', 'Step into your Community')}
          </h2>
          <p style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: '1.6', marginBottom: '28px' }}>
            {t(
              'auth.invite.mobileHandoffDesc',
              'Open the Nahom mobile app to join your community with seamless gate access and features, or get the app below.'
            )}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={handleLaunchApp}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#F45A0A',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(244, 90, 10, 0.3)',
              }}
            >
              📱 {t('auth.invite.openInApp', 'Open in Nahom App')}
            </button>

            <button
              type="button"
              onClick={handleOpenStore}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              📥 {isAndroid ? t('auth.invite.getOnPlayStore', 'Get on Google Play') : t('auth.invite.getOnAppStore', 'Get on App Store')}
            </button>

            <button
              type="button"
              onClick={handleContinueInWeb}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#94A3B8',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              🌐 {t('auth.invite.continueInWeb', 'Continue in Web Browser')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'mismatch') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px 16px',
          backgroundColor: '#0D1B35',
          color: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '32px 24px',
            backdropFilter: 'blur(10px)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 107, 0, 0.2)',
              color: '#FF6B00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '24px',
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
            {t('auth.invite.accountMismatchTitle', 'Invitation Account Mismatch')}
          </h2>
          <p style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: '1.6', marginBottom: '24px' }}>
            {errorMessage || t('auth.invite.accountMismatchDesc', 'This invitation was sent to a different account.')}
            <br />
            {currentUser?.email && (
              <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                ({t('auth.invite.currentlyLoggedInAs', 'Currently logged in as:')} <strong>{currentUser.email}</strong>)
              </span>
            )}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={handleLogoutAndSwitch}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#FF6B00',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {t('auth.invite.logoutAndSwitch', 'Switch Account & Accept')}
            </button>
            <button
              type="button"
              onClick={handleContinueCurrent}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'transparent',
                color: '#E2E8F0',
                fontWeight: 500,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {t('auth.invite.continueCurrent', 'Stay on Current Account')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AppLoader variant="fullscreen" />;
}