import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

const AmenitiesRedirector = () => {
  const navigate = useNavigate();
  const { checkPermission } = useAuth();

  useEffect(() => {
    // Admin priorities
    if (checkPermission('amenities:dashboard')) {
      navigate('/admin/amenities/dashboard', { replace: true });
    } else if (checkPermission('amenities:amenities')) {
      navigate('/admin/amenities/master', { replace: true });
    } else if (checkPermission('amenities:admin_calander')) {
      navigate('/admin/amenities/calendar', { replace: true });
    } else if (checkPermission('amenities:ledgers')) {
      navigate('/admin/amenities/ledgers', { replace: true });
    } else if (checkPermission('amenities:maintenance')) {
      navigate('/admin/amenities/maintenance', { replace: true });
    } else if (checkPermission('amenities:scanner')) {
      navigate('/admin/amenities/scanner', { replace: true });
    } else if (checkPermission('amenities:security_logs')) {
      navigate('/admin/amenities/security-logs', { replace: true });
    } 
    // Resident priorities
    else if (checkPermission('amenities:discover')) {
      navigate('/resident/amenities/discover', { replace: true });
    } else if (checkPermission('amenities:my_booking')) {
      navigate('/resident/amenities/calendar', { replace: true });
    } else if (checkPermission('amenities:wallet')) {
      navigate('/resident/amenities/wallet', { replace: true });
    } else {
      // Fallback
      navigate('/dashboard', { replace: true });
    }
  }, [checkPermission, navigate]);

  return null;
};

export default AmenitiesRedirector;
