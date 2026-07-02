import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateOrganizationFeatures } from '../../organization/services/organizationApi.js';
import { setActiveWorkspace } from '../store/workspaceSlice.js';
import { updateTokenAndUser } from '../../auth/store/authSlice.js';

/**
 * Custom hook acting as the controller for Feature Configuration Wizard.
 */
export const useFeatureConfig = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const activeOrganizationId = useSelector((state) => state.workspace.activeOrganizationId);
  const activeRole = useSelector((state) => state.workspace.activeRole);
  const allowedFeatures = useSelector((state) => state.workspace.allowedFeatures) || [];
  const currentUser = useSelector((state) => state.auth.user);

  const [selectedFeatures, setSelectedFeatures] = useState(() => {
    if (allowedFeatures.length === 0) {
      return ['users', 'roles', 'integrations', 'villas'];
    }
    const initial = [];
    if (allowedFeatures.includes('users') || allowedFeatures.some(f => typeof f === 'string' && f.startsWith('users:'))) initial.push('users');
    if (allowedFeatures.includes('roles') || allowedFeatures.some(f => typeof f === 'string' && f.startsWith('roles:'))) initial.push('roles');
    if (allowedFeatures.includes('integrations') || allowedFeatures.some(f => typeof f === 'string' && f.startsWith('integrations:'))) initial.push('integrations');
    if (allowedFeatures.includes('villas') || allowedFeatures.some(f => typeof f === 'string' && f.startsWith('villas:'))) initial.push('villas');
    return initial;
  });

  // Keep selectedFeatures in sync if allowedFeatures updates or resolves
  useEffect(() => {
    if (allowedFeatures.length > 0) {
      const initial = [];
      if (allowedFeatures.includes('users') || allowedFeatures.some(f => typeof f === 'string' && f.startsWith('users:'))) initial.push('users');
      if (allowedFeatures.includes('roles') || allowedFeatures.some(f => typeof f === 'string' && f.startsWith('roles:'))) initial.push('roles');
      if (allowedFeatures.includes('integrations') || allowedFeatures.some(f => typeof f === 'string' && f.startsWith('integrations:'))) initial.push('integrations');
      if (allowedFeatures.includes('villas') || allowedFeatures.some(f => typeof f === 'string' && f.startsWith('villas:'))) initial.push('villas');
      setSelectedFeatures(initial);
    } else {
      setSelectedFeatures(['users', 'roles', 'integrations', 'villas']);
    }
  }, [allowedFeatures]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleFeature = (featureId) => {
    setSelectedFeatures((prevSelected) => {
      if (prevSelected.includes(featureId)) {
        return prevSelected.filter((id) => id !== featureId);
      } else {
        return [...prevSelected, featureId];
      }
    });
  };

  const submitFeatures = async () => {
    if (!activeOrganizationId) {
      setError('workspace.wizard.errors.noOrganization');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await updateOrganizationFeatures(activeOrganizationId, selectedFeatures);
      
      const dataPayload = response?.data;
      const organization = dataPayload?.organization || dataPayload;
      const allowedFeatures = organization?.allowedFeatures || selectedFeatures;
      const newToken = dataPayload?.token;

      // Update allowedFeatures in Redux store
      dispatch(
        setActiveWorkspace({
          activeOrganizationId: activeOrganizationId,
          activeRole: activeRole,
          allowedFeatures: allowedFeatures,
        })
      );

      // If a new token is returned, update Redux and LocalStorage
      if (newToken) {
        try {
          const base64Url = newToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            window.atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);

          if (decoded) {
            const updatedUser = {
              ...currentUser,
              id: decoded.id,
              email: decoded.email,
              username: decoded.username,
              role: decoded.role,
              permissions: decoded.permissions,
              orgId: decoded.orgId,
              isPlatformAdmin: decoded.isPlatformAdmin,
            };
            dispatch(updateTokenAndUser({ token: newToken, user: updatedUser }));
          }
        } catch (decodeErr) {
          console.error('Failed to decode fresh JWT token:', decodeErr);
        }
      }

      setLoading(false);
      window.location.hash = '#/dashboard';
      window.location.reload();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'workspace.wizard.error');
    }
  };

  return {
    selectedFeatures,
    loading,
    error,
    toggleFeature,
    submitFeatures,
  };
};

export default useFeatureConfig;
