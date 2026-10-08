import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppLoader from '../../../components/common/AppLoader';

export default function InviteHandler() {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = routeToken || searchParams.get('token') || '';
  useEffect(() => {
    navigate(token ? `/login?invite_token=${encodeURIComponent(token)}` : '/login', { replace: true });
  }, [navigate, token]);
  return <AppLoader variant="fullscreen" />;
}