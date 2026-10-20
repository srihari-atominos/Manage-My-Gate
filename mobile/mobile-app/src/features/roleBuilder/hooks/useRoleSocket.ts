import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { fetchRolesAsync } from '../store/roleSlice';
import { updateTokenAndUser } from '../../auth/store/authSlice';
import { getUserRoleName } from '../../../utils/rbac';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { hasRolePermission } from '../roleAccess';

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
  const { socket } = useAppSocket();
  const lastQuery = useSelector((state: RootState) => state.roleBuilder.lastQuery);
  const lastQueryRef = useRef(lastQuery);
  lastQueryRef.current = lastQuery;

  const activeOrgId =
    currentUser?.orgId ||
    currentUser?.organizationId ||
    currentUser?.activeOrgId ||
    authState?.organizationId ||
    '';

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      if (activeOrgId) {
        socket.emit('join_room', `org:${activeOrgId}`);
      }
    };

    const handleRoleUpdate = (payload: any) => {
      // 1. Refresh the Role Builder list, keeping the visible page, search and scope filter
      if (hasRolePermission(currentUser, 'read')) {
        dispatch(fetchRolesAsync(lastQueryRef.current));
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

    const handleRecordUpdate = (payload: any) => {
      if (payload?.type === 'ROLE') {
        handleRoleUpdate(payload);
      } else if (payload?.type === 'USER') {
        handleUserUpdate(payload);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('ROLE_UPDATED', handleRoleUpdate);
    socket.on('USER_UPDATED', handleUserUpdate);
    socket.on('RECORD_UPDATED', handleRecordUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('ROLE_UPDATED', handleRoleUpdate);
      socket.off('USER_UPDATED', handleUserUpdate);
      socket.off('RECORD_UPDATED', handleRecordUpdate);
    };
  }, [activeOrgId, currentUser, dispatch, socket]);
};

export default useRoleSocket;
