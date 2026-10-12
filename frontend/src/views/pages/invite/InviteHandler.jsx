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

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login?invite_token=${encodeURIComponent(token)}`, { replace: true });
      return;
    }

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
          if (isMismatch) {
            setStatus('mismatch');
            setErrorMessage(err);
          } else {
            toast.error(err || t('auth.invite.error', 'Unable to accept invitation.'));
            setStatus('error');
            setErrorMessage(err || 'Unable to accept invitation.');
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (e) {
        if (!isMounted) return;
        toast.error(e?.message || t('auth.invite.error', 'Failed to accept invitation.'));
        setStatus('error');
        setErrorMessage(e?.message || 'Failed to accept invitation.');
        navigate('/dashboard', { replace: true });
      }
    };

    acceptInviteAsync();

    return () => {
      isMounted = false;
    };
  }, [token, isAuthenticated]);

  const handleLogoutAndSwitch = async () => {
    await logout();
    navigate(`/login?invite_token=${encodeURIComponent(token)}`, { replace: true });
  };

  const handleContinueCurrent = () => {
    navigate('/dashboard', { replace: true });
  };

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