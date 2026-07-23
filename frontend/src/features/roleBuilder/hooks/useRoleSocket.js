import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import config from '../../../config/config.js';
import { switchWorkspaceContext } from '../../auth/store/authSlice';

/**
 * Custom Hook: useRoleSocket
 * 
 * Listens for real-time ROLE_UPDATED events from Socket.io.
 * If the active user's role is updated, it triggers a silent token refresh
 * to immediately reflect new permissions without a hard page reload.
 */
export const useRoleSocket = () => {
  const dispatch = useDispatch();
  const activeOrgId = useSelector(state => state.workspace?.activeOrganizationId);
  const activeRoleName = useSelector(state => state.workspace?.activeRole);

  useEffect(() => {
    if (!activeOrgId) {
      return;
    }

    const socketUrl = config.socketUrl;

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      // Listen to organization-wide updates
      socket.emit('join_room', `org:${activeOrgId}`);
    });

    socket.on('ROLE_UPDATED', (payload) => {
      // Check if the role being updated matches the user's active role context
      if (payload.roleName === activeRoleName) {
        // Silently refresh the workspace context (JWT + permissions)
        dispatch(switchWorkspaceContext({ targetOrgId: activeOrgId }));
      }
    });

    return () => {
      socket.off('ROLE_UPDATED');
      socket.disconnect();
    };
  }, [activeOrgId, activeRoleName, dispatch]);
};

export default useRoleSocket;
