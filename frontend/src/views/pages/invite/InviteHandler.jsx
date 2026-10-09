import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppLoader from '../../../components/common/AppLoader';

export default function InviteHandler() {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  
  const token = routeToken || searchParams.get('token') || '';
  
  useEffect(() => {
    // Detect mobile devices based on User Agent
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    
    if (isAndroid) {
      setMessage('Redirecting to Google Play Store...');
      window.location.href = 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom';
    } else if (isIOS) {
      setMessage('Redirecting to App Store...');
      // Note: Needs the actual numeric Apple App ID once published
      window.location.href = 'https://apps.apple.com/app/idYOUR_APPLE_APP_ID_HERE'; 
    } else {
      // PC / Desktop - continue to Web Dashboard Login
      navigate(token ? `/login?invite_token=${encodeURIComponent(token)}` : '/login', { replace: true });
    }
  }, [navigate, token]);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#FFF8EF' }}>
      <AppLoader variant="fullscreen" />
      {message && (
        <p style={{ marginTop: '20px', fontFamily: '"Hanken Grotesk", sans-serif', color: '#171717', fontWeight: '500', position: 'relative', zIndex: 10 }}>
          {message}
        </p>
      )}
    </div>
  );
}