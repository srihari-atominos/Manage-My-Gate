import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import useAppSocket from './useAppSocket';
import { updateTokenAndUser, switchWorkspaceContextThunk } from '../features/auth/store/authSlice';
import { fetchRolesAsync } from '../features/roleBuilder/store/roleSlice';
import { fetchConnections } from '../features/integrationHub/store/integrationHubSlice';
import { fetchUsersThunk } from '../features/userManagement/store/userSlice';
import { fetchVisitorPassesThunk, fetchActiveVisitorsThunk } from '../features/visitor/store/adminVisitorThunks';
import { fetchDuesThunk } from '../features/billing/store/billingSlice';
import { fetchComplaintsThunk } from '../features/complaints/store/complaintSlice';
import { fetchNoticesThunk } from '../features/noticeBoard/store/noticeBoardSlice';
import { fetchNotesThunk } from '../features/directory/store/communityNoteSlice';
import { getUserRoleName } from '../utils/rbac';

/**
 * Global Real-Time Socket Manager Hook
 * Mounts at root level (_layout.tsx) to handle app-wide Socket.io real-time updates.
 * Updates UI state across Role Builder, Integration Hub, User Management, Visitor Passes,
 * Billing, Complaints, Notices, and Community Notes automatically without manual page reloads.
 */
export const useGlobalAppSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();
  const authState = useSelector((state: RootState) => (state as any).auth);
  const currentUser = authState?.user;
  const isAuthenticated = authState?.isAuthenticated;

  useEffect(() => {
    if (!socket || !isAuthenticated || !currentUser) return;

    // 1. Role & Permission Updates
    const handleRoleOrUserUpdate = (payload: any) => {
      // Refetch roles & users
      dispatch(fetchRolesAsync({ page: 1, limit: 100 })).catch(() => {});
      dispatch(fetchUsersThunk({ page: 1, limit: 100 })).catch(() => {});

      if (!payload) return;

      const currentId = currentUser.id || currentUser._id;
      const targetUserId = payload.userId || payload.data?.userId || payload.id;
      const userRole = getUserRoleName(currentUser);
      const updatedRoleName = payload.roleName || payload.data?.roleName || payload.role;
      const updatedRoleId = payload.roleId || payload.data?.roleId;
      const updatedPermissions = payload.permissions || payload.data?.permissions;

      const isUserMatch = targetUserId && String(targetUserId) === String(currentId);
      const isRoleMatch =
        (updatedRoleName && userRole.toLowerCase() === String(updatedRoleName).toLowerCase()) ||
        (updatedRoleId && (currentUser.roleId === updatedRoleId || currentUser.role === updatedRoleId));

      if (isUserMatch || isRoleMatch) {
        if (Array.isArray(updatedPermissions)) {
          dispatch(
            updateTokenAndUser({
              user: {
                ...currentUser,
                permissions: updatedPermissions,
                ...(payload.role ? { role: payload.role } : {}),
              },
            })
          );
        }
        // Re-sync session context from backend to ensure all scoped permissions and features are fresh
        dispatch(switchWorkspaceContextThunk({})).catch(() => {});
      }
    };

    // 2. Integration Hub Updates
    const handleIntegrationUpdate = () => {
      dispatch(fetchConnections()).catch(() => {});
    };

    // 3. Visitor Management Pass & Log Updates
    const handleVisitorUpdate = () => {
      dispatch(fetchVisitorPassesThunk({})).catch(() => {});
      dispatch(fetchActiveVisitorsThunk()).catch(() => {});
    };

    // 4. Billing & Dues Updates
    const handleBillingUpdate = () => {
      dispatch(fetchDuesThunk()).catch(() => {});
    };

    // 5. Complaint Updates
    const handleComplaintUpdate = () => {
      dispatch(fetchComplaintsThunk({})).catch(() => {});
    };

    // 6. Notice Board Updates
    const handleNoticeUpdate = () => {
      dispatch(fetchNoticesThunk({})).catch(() => {});
    };

    // 7. Community Pulse Notes Updates
    const handleCommunityNoteUpdate = () => {
      dispatch(fetchNotesThunk({})).catch(() => {});
    };

    // 8. Organization & Workspace Lifecycle Updates
    const handleOrgUpdate = () => {
      dispatch(switchWorkspaceContextThunk({})).catch(() => {});
    };

    // Attach Event Listeners
    socket.on('ROLE_UPDATED', handleRoleOrUserUpdate);
    socket.on('USER_UPDATED', handleRoleOrUserUpdate);
    socket.on('USER_ROLE_UPDATED', handleRoleOrUserUpdate);
    socket.on('PERMISSIONS_UPDATED', handleRoleOrUserUpdate);

    socket.on('ORGANIZATION_DELETED', handleOrgUpdate);
    socket.on('ORGANIZATION_UPDATED', handleOrgUpdate);
    socket.on('ORGANIZATION_STATUS_CHANGED', handleOrgUpdate);
    socket.on('WORKSPACE_DELETED', handleOrgUpdate);
    socket.on('WORKSPACE_UPDATED', handleOrgUpdate);

    socket.on('INTEGRATION_UPDATED', handleIntegrationUpdate);
    socket.on('INTEGRATION_CONNECTED', handleIntegrationUpdate);
    socket.on('INTEGRATION_DISCONNECTED', handleIntegrationUpdate);

    socket.on('VISITOR_PASS_CREATED', handleVisitorUpdate);
    socket.on('VISITOR_PASS_UPDATED', handleVisitorUpdate);
    socket.on('VISITOR_CHECKED_IN', handleVisitorUpdate);
    socket.on('VISITOR_CHECKED_OUT', handleVisitorUpdate);

    socket.on('BILLING_UPDATED', handleBillingUpdate);
    socket.on('INVOICE_CREATED', handleBillingUpdate);

    socket.on('COMPLAINT_UPDATED', handleComplaintUpdate);
    socket.on('COMPLAINT_CREATED', handleComplaintUpdate);

    socket.on('NOTICE_CREATED', handleNoticeUpdate);
    socket.on('NOTICE_UPDATED', handleNoticeUpdate);

    socket.on('COMMUNITY_NOTE_CREATED', handleCommunityNoteUpdate);

    socket.on('RECORD_UPDATED', (payload: any) => {
      if (!payload) return;
      const type = String(payload.type || '').toUpperCase();
      if (type === 'ROLE' || type === 'USER') {
        handleRoleOrUserUpdate(payload);
      } else if (type === 'ORGANIZATION' || type === 'WORKSPACE') {
        handleOrgUpdate();
      } else if (type === 'INTEGRATION') {
        handleIntegrationUpdate();
      } else if (type === 'VISITOR') {
        handleVisitorUpdate();
      } else if (type === 'BILLING') {
        handleBillingUpdate();
      } else if (type === 'COMPLAINT') {
        handleComplaintUpdate();
      } else if (type === 'NOTICE') {
        handleNoticeUpdate();
      }
    });

    return () => {
      socket.off('ROLE_UPDATED', handleRoleOrUserUpdate);
      socket.off('USER_UPDATED', handleRoleOrUserUpdate);
      socket.off('USER_ROLE_UPDATED', handleRoleOrUserUpdate);
      socket.off('PERMISSIONS_UPDATED', handleRoleOrUserUpdate);
      socket.off('ORGANIZATION_DELETED', handleOrgUpdate);
      socket.off('ORGANIZATION_UPDATED', handleOrgUpdate);
      socket.off('ORGANIZATION_STATUS_CHANGED', handleOrgUpdate);
      socket.off('WORKSPACE_DELETED', handleOrgUpdate);
      socket.off('WORKSPACE_UPDATED', handleOrgUpdate);
      socket.off('INTEGRATION_UPDATED', handleIntegrationUpdate);
      socket.off('INTEGRATION_CONNECTED', handleIntegrationUpdate);
      socket.off('INTEGRATION_DISCONNECTED', handleIntegrationUpdate);
      socket.off('VISITOR_PASS_CREATED', handleVisitorUpdate);
      socket.off('VISITOR_PASS_UPDATED', handleVisitorUpdate);
      socket.off('VISITOR_CHECKED_IN', handleVisitorUpdate);
      socket.off('VISITOR_CHECKED_OUT', handleVisitorUpdate);
      socket.off('BILLING_UPDATED', handleBillingUpdate);
      socket.off('INVOICE_CREATED', handleBillingUpdate);
      socket.off('COMPLAINT_UPDATED', handleComplaintUpdate);
      socket.off('COMPLAINT_CREATED', handleComplaintUpdate);
      socket.off('NOTICE_CREATED', handleNoticeUpdate);
      socket.off('NOTICE_UPDATED', handleNoticeUpdate);
      socket.off('COMMUNITY_NOTE_CREATED', handleCommunityNoteUpdate);
      socket.off('RECORD_UPDATED');
    };
  }, [socket, isAuthenticated, currentUser, dispatch]);
};

export default useGlobalAppSocket;
