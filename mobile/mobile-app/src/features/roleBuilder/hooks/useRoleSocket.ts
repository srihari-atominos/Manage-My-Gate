import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchRolesAsync } from '../store/roleSlice';
import { updateTokenAndUser } from '../../auth/store/authSlice';
import { getUserRoleName } from '../../../utils/rbac';

const DEFAULT_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5002';

/**
 * Custom Hook: useRoleSocket
 *
 * Listens for real-time ROLE_UPDATED, USER_UPDATED & RECORD_UPDATED events from Socket.io.
 * Refetches roles list and updates active user's role and permissions in real-time when updated.
 */
export const useRoleSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => (state as any).auth);
  const currentUser = authState?.user;
  const token = authState?.token || authState?.accessToken;

  const activeOrgId =
    currentUser?.orgId ||
    currentUser?.organizationId ||
    currentUser?.activeOrgId ||
    authState?.organizationId ||
    '';

  useEffect(() => {
    const socket = io(DEFAULT_SOCKET_URL, {
      ...(token ? { auth: { token } } : {}),
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      if (activeOrgId) {
        socket.emit('join_room', `org:${activeOrgId}`);
      }
    });

    const handleRoleUpdate = (payload: any) => {
      // 1. Refetch Role Builder list only if user has role:read permission
      const permissions: string[] = currentUser?.permissions || [];
      const userRoleName = getUserRoleName(currentUser);
      const isSuperAdmin = userRoleName === 'SuperAdmin' || userRoleName === 'Admin';
      const canReadRoles = isSuperAdmin || permissions.includes('role:read') || permissions.includes('roles:read') || permissions.includes('*');

      if (canReadRoles) {
        dispatch(fetchRolesAsync({ page: 1, limit: 100 }));
      }

      // 2. Real-time live update for active user permissions if their role was updated
      if (payload && currentUser) {
        const userRole = getUserRoleName(currentUser);
        const updatedRoleName = payload.roleName || payload.data?.roleName;
        const updatedRoleId = payload.roleId || payload.data?.roleId;
        const updatedPermissions = payload.permissions || payload.data?.permissions;

        const isUserRoleMatch =
          (updatedRoleName && userRole.toLowerCase() === String(updatedRoleName).toLowerCase()) ||
          (updatedRoleId && (currentUser.roleId === updatedRoleId || currentUser.role === updatedRoleId));

        if (isUserRoleMatch && Array.isArray(updatedPermissions)) {
          dispatch(
            updateTokenAndUser({
              user: {
                ...currentUser,
                permissions: updatedPermissions,
              },
            })
          );
        }
      }
    };

    const handleUserUpdate = (payload: any) => {
      if (!payload || !currentUser) return;
      const targetUserId = payload.userId || payload.data?.userId;
      const currentId = currentUser.id || currentUser._id;

      if (targetUserId && String(targetUserId) === String(currentId)) {
        const newRoles = payload.roles || payload.data?.roles;
        const newPermissions = payload.permissions || payload.data?.permissions;

        const updatedUser = {
          ...currentUser,
          ...(Array.isArray(newRoles) && newRoles.length > 0 ? { role: newRoles[0] } : {}),
          ...(Array.isArray(newPermissions) ? { permissions: newPermissions } : {}),
        };

        dispatch(updateTokenAndUser({ user: updatedUser }));
      }
    };

    socket.on('ROLE_UPDATED', handleRoleUpdate);
    socket.on('USER_UPDATED', handleUserUpdate);
    socket.on('RECORD_UPDATED', (payload: any) => {
      if (payload?.type === 'ROLE') {
        handleRoleUpdate(payload);
      } else if (payload?.type === 'USER') {
        handleUserUpdate(payload);
      }
    });

    return () => {
      socket.off('ROLE_UPDATED', handleRoleUpdate);
      socket.off('USER_UPDATED', handleUserUpdate);
      socket.off('RECORD_UPDATED');
      socket.disconnect();
    };
  }, [activeOrgId, token, currentUser, dispatch]);
};

export default useRoleSocket;
