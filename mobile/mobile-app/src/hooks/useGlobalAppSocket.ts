import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import useAppSocket from './useAppSocket';
import { updateTokenAndUser, switchWorkspaceContextThunk } from '../features/auth/store/authSlice';
import { fetchConnectionsAsync } from '../features/integrationHub/store/integrationHubSlice';
import {
  getPasses,
  fetchActiveVisitorsThunk,
  walkInPendingReceived,
  walkInResolvedReceived,
  fetchPendingWalkIns,
  fetchDashboardSummary,
} from '../features/visitor/store/visitorPassSlice';
import { mapBackendWalkInToApprovalItem } from '../features/visitor/utils/mapBackendWalkInToApprovalItem';
import { fetchMyDues, fetchInvoicesGrid } from '../features/billing/store/billingSlice';
import { fetchComplaints } from '../features/complaints/store/complaintSlice';
import { fetchNotices } from '../features/noticeBoard/store/noticeBoardSlice';
import { fetchActiveNotes } from '../features/directory/store/communityNoteSlice';
import {
  fetchStaffThunk,
  fetchMyProfileThunk,
  fetchAssociationsThunk,
  fetchMyAllocationsThunk,
  fetchEligibleStaffThunk,
  fetchAttendanceStatsThunk,
  fetchAttendanceHistoryThunk,
  fetchMyAttendanceThunk,
} from '../features/staff/store/staffSlice';
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

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const debounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debounceDispatch = (key: string, fn: () => void, delayMs = 350) => {
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }
    debounceTimersRef.current[key] = setTimeout(() => {
      delete debounceTimersRef.current[key];
      fn();
    }, delayMs);
  };

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const isMatchingTenant = (payload: any) => {
      if (!payload || typeof payload !== 'object') return true;
      const targetOrg =
        payload.orgId ||
        payload.organizationId ||
        payload.data?.orgId ||
        payload.data?.organizationId;
      if (!targetOrg) return true; // Broadcast without specific tenant constraint
      const u = currentUserRef.current;
      const activeOrg = u?.orgId || u?.activeOrgId;
      if (!activeOrg) return true;
      return String(targetOrg) === String(activeOrg);
    };

    // 1. Role & Permission Updates
    const handleRoleOrUserUpdate = (payload: any) => {
      if (!isMatchingTenant(payload)) return;
      const u = currentUserRef.current;
      const userRole = getUserRoleName(u);

      // Role Builder and User Management own their focused list refreshes.
      // The global socket must not refetch both large lists on every role event.
      if (!payload || !u) return;

      const currentId = u.id || u._id;
      const targetUserId = payload.userId || payload.data?.userId || payload.id;
      const updatedRoleName = payload.roleName || payload.data?.roleName || payload.role;
      const updatedRoleId = payload.roleId || payload.data?.roleId;
      const updatedPermissions = payload.permissions || payload.data?.permissions;

      const isUserMatch = targetUserId && String(targetUserId) === String(currentId);
      const isRoleMatch =
        (updatedRoleName && userRole.toLowerCase() === String(updatedRoleName).toLowerCase()) ||
        (updatedRoleId && (u.roleId === updatedRoleId || u.role === updatedRoleId));

      if (isUserMatch || isRoleMatch) {
        if (Array.isArray(updatedPermissions)) {
          dispatch(
            updateTokenAndUser({
              user: {
                ...u,
                permissions: updatedPermissions,
                ...(payload.role ? { role: payload.role } : {}),
              },
            })
          );
        }
        // The event carries authoritative permissions. Avoid a full workspace
        // switch here; Role Builder performs an explicit session refresh after save.
      }
    };

    // 2. Integration Hub Updates
    const handleIntegrationUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('integration', () => {
        dispatch(fetchConnectionsAsync()).catch(() => {});
      });
    };

    // 3. Visitor Management Pass & Log Updates
    const handleVisitorUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('visitor', () => {
        const u = currentUserRef.current;
        const orgId = u?.orgId || u?.activeOrgId || '';
        dispatch(getPasses({ orgId, params: { page: 1, limit: 20 } })).catch(() => {});
        dispatch(fetchActiveVisitorsThunk(orgId)).catch(() => {});
      });
    };

    const handleGateApprovalRequest = (log: any) => {
      if (!log) return;
      if (log.entryType && log.entryType !== 'WALK_IN') return;

      const mappedItem = mapBackendWalkInToApprovalItem(log);
      dispatch(walkInPendingReceived({ mappedItem, rawLog: log }));

      // Also trigger a background refresh of dashboard summary and pending walk-ins
      const u = currentUserRef.current;
      const orgId = u?.orgId || u?.activeOrgId || log.orgId;
      if (orgId) {
        debounceDispatch('walkin_recovery', () => {
          dispatch(fetchPendingWalkIns(orgId)).catch(() => {});
          dispatch(fetchDashboardSummary(orgId)).catch(() => {});
        }, 100);
      }
    };

    const handleGateApprovalResolved = (log: any) => {
      if (!log || !log._id) return;
      dispatch(walkInResolvedReceived({ id: log._id, rawLog: log }));

      const u = currentUserRef.current;
      const orgId = u?.orgId || u?.activeOrgId || log.orgId;
      if (orgId) {
        debounceDispatch('walkin_recovery', () => {
          dispatch(fetchPendingWalkIns(orgId)).catch(() => {});
          dispatch(fetchDashboardSummary(orgId)).catch(() => {});
        }, 100);
      }
    };

    // 4. Billing & Dues Updates
    const handleBillingUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('billing', () => {
        const u = currentUserRef.current;
        const permissions: string[] = u?.permissions || [];
        const userRole = getUserRoleName(u);
        const isSuperAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';
        const canReadInvoices = isSuperAdmin || permissions.includes('billing:dashboard') || permissions.includes('*');

        dispatch(fetchMyDues()).catch(() => {});
        if (canReadInvoices) dispatch(fetchInvoicesGrid({ page: 1, limit: 20 })).catch(() => {});
      });
    };

    // 5. Complaint Updates
    const handleComplaintUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('complaint', () => {
        dispatch(fetchComplaints({})).catch(() => {});
      });
    };

    // 6. Notice Board Updates
    const handleNoticeUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('notice', () => {
        dispatch(fetchNotices()).catch(() => {});
      });
    };

    // 7. Community Pulse Notes Updates
    const handleCommunityNoteUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('community_note', () => {
        dispatch(fetchActiveNotes()).catch(() => {});
      });
    };

    // 8. Organization & Workspace Lifecycle Updates
    const handleOrgUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('org_lifecycle', () => {
        dispatch(switchWorkspaceContextThunk({})).catch(() => {});
      });
    };

    // 9. Staff Profile & Directory Updates
    const handleStaffDirectoryUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('staff_directory', () => {
        const u = currentUserRef.current;
        const permissions: string[] = u?.permissions || [];
        const userRole = getUserRoleName(u);
        const isAdmin = userRole === 'SuperAdmin' || userRole === 'Admin' || userRole === 'Community Admin';
        const canViewStaff =
          isAdmin ||
          permissions.includes('*') ||
          permissions.includes('staff:view') ||
          permissions.includes('staff:manage') ||
          permissions.includes('complaints:staff') ||
          permissions.includes('complaints:assign') ||
          permissions.includes('complaints:settings');
        const roleScope =
          u?.roleScope ||
          u?.activeRoleObj?.roleScope ||
          (typeof u?.role === 'object' ? u.role?.roleScope : '');
        const canViewOwn =
          permissions.includes('*') ||
          permissions.includes('staff:view_own') ||
          permissions.includes('staff:portal') ||
          roleScope === 'COMMUNITY_STAFF' ||
          roleScope === 'STAFF';

        if (canViewStaff) dispatch(fetchStaffThunk(undefined)).catch(() => {});
        if (canViewOwn) dispatch(fetchMyProfileThunk()).catch(() => {});
      });
    };

    // 10. Staff Household Allocations & Associations Updates
    const handleStaffAssociationUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('staff_associations', () => {
        const u = currentUserRef.current;
        const permissions: string[] = u?.permissions || [];
        const userRole = getUserRoleName(u);
        const isAdmin = userRole === 'SuperAdmin' || userRole === 'Admin' || userRole === 'Community Admin';
        const canAssignOrManage =
          isAdmin ||
          permissions.includes('*') ||
          permissions.includes('staff:assign_unit') ||
          permissions.includes('staff:manage');
        const canViewEligible =
          canAssignOrManage ||
          permissions.includes('staff:view');
        const canViewAllocations =
          isAdmin ||
          permissions.includes('*') ||
          permissions.includes('staff:view_own') ||
          permissions.includes('staff:assign_unit') ||
          permissions.includes('staff:manage');

        if (canAssignOrManage) dispatch(fetchAssociationsThunk(undefined)).catch(() => {});
        if (canViewAllocations) dispatch(fetchMyAllocationsThunk()).catch(() => {});
        if (canViewEligible) dispatch(fetchEligibleStaffThunk()).catch(() => {});
      });
    };

    // 11. Staff Attendance & Gate Logs Updates
    const handleStaffAttendanceUpdate = (payload?: any) => {
      if (!isMatchingTenant(payload)) return;
      debounceDispatch('staff_attendance', () => {
        const u = currentUserRef.current;
        const permissions: string[] = u?.permissions || [];
        const userRole = getUserRoleName(u);
        const isAdmin = userRole === 'SuperAdmin' || userRole === 'Admin' || userRole === 'Community Admin';
        const canViewAttendance =
          isAdmin ||
          permissions.includes('*') ||
          permissions.includes('staff:attendance') ||
          permissions.includes('staff:manage') ||
          permissions.includes('visitor:guard') ||
          permissions.includes('staff:view');
        const canViewMyAttendance =
          isAdmin ||
          permissions.includes('*') ||
          permissions.includes('staff:view_own') ||
          permissions.includes('staff:manage') ||
          permissions.includes('staff:view');

        if (canViewAttendance) {
          dispatch(fetchAttendanceStatsThunk()).catch(() => {});
          dispatch(fetchAttendanceHistoryThunk()).catch(() => {});
        }
        if (canViewMyAttendance) {
          dispatch(fetchMyAttendanceThunk()).catch(() => {});
        }
      });
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
    socket.on('GATE_APPROVAL_REQUEST', handleGateApprovalRequest);
    socket.on('GATE_APPROVAL_RESOLVED', handleGateApprovalResolved);

    socket.on('BILLING_UPDATED', handleBillingUpdate);
    socket.on('INVOICE_CREATED', handleBillingUpdate);

    // Complaint / Work Orders (both uppercase and backend lowercase canonical events)
    socket.on('COMPLAINT_UPDATED', handleComplaintUpdate);
    socket.on('COMPLAINT_CREATED', handleComplaintUpdate);
    socket.on('complaint_created', handleComplaintUpdate);
    socket.on('complaint_updated', handleComplaintUpdate);
    socket.on('complaint_assigned', handleComplaintUpdate);
    socket.on('complaint_started', handleComplaintUpdate);
    socket.on('complaint_completed', handleComplaintUpdate);
    socket.on('complaint_closed', handleComplaintUpdate);

    // Staff Management, Allocations & Attendance
    socket.on('staff:created', handleStaffDirectoryUpdate);
    socket.on('staff:profile_updated', handleStaffDirectoryUpdate);
    socket.on('staff:deleted', handleStaffDirectoryUpdate);

    socket.on('staff:association_created', handleStaffAssociationUpdate);
    socket.on('staff:association_accepted', handleStaffAssociationUpdate);
    socket.on('staff:association_rejected', handleStaffAssociationUpdate);
    socket.on('staff:association_removed', handleStaffAssociationUpdate);
    socket.on('staff:unit_association_requested', handleStaffAssociationUpdate);

    socket.on('staff:attendance_updated', handleStaffAttendanceUpdate);
    socket.on('staff:entry', handleStaffAttendanceUpdate);
    socket.on('staff:exit', handleStaffAttendanceUpdate);

    socket.on('NOTICE_CREATED', handleNoticeUpdate);
    socket.on('NOTICE_UPDATED', handleNoticeUpdate);

    socket.on('COMMUNITY_NOTE_CREATED', handleCommunityNoteUpdate);

    socket.on('RECORD_UPDATED', (payload: any) => {
      if (!payload) return;
      const type = String(payload.type || '').toUpperCase();
      if (type === 'ROLE' || type === 'USER') {
        handleRoleOrUserUpdate(payload);
      } else if (type === 'ORGANIZATION' || type === 'WORKSPACE') {
        handleOrgUpdate(payload);
      } else if (type === 'INTEGRATION') {
        handleIntegrationUpdate(payload);
      } else if (type === 'VISITOR') {
        handleVisitorUpdate(payload);
      } else if (type === 'BILLING') {
        handleBillingUpdate(payload);
      } else if (type === 'COMPLAINT') {
        handleComplaintUpdate(payload);
      } else if (type === 'STAFF' || type === 'STAFF_PROFILE') {
        handleStaffDirectoryUpdate(payload);
      } else if (type === 'STAFF_ASSOCIATION' || type === 'STAFF_ALLOCATION') {
        handleStaffAssociationUpdate(payload);
      } else if (type === 'STAFF_ATTENDANCE') {
        handleStaffAttendanceUpdate(payload);
      } else if (type === 'NOTICE') {
        handleNoticeUpdate(payload);
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
      socket.off('GATE_APPROVAL_REQUEST', handleGateApprovalRequest);
      socket.off('GATE_APPROVAL_RESOLVED', handleGateApprovalResolved);
      socket.off('BILLING_UPDATED', handleBillingUpdate);
      socket.off('INVOICE_CREATED', handleBillingUpdate);
      socket.off('COMPLAINT_UPDATED', handleComplaintUpdate);
      socket.off('COMPLAINT_CREATED', handleComplaintUpdate);
      socket.off('complaint_created', handleComplaintUpdate);
      socket.off('complaint_updated', handleComplaintUpdate);
      socket.off('complaint_assigned', handleComplaintUpdate);
      socket.off('complaint_started', handleComplaintUpdate);
      socket.off('complaint_completed', handleComplaintUpdate);
      socket.off('complaint_closed', handleComplaintUpdate);
      socket.off('staff:created', handleStaffDirectoryUpdate);
      socket.off('staff:profile_updated', handleStaffDirectoryUpdate);
      socket.off('staff:deleted', handleStaffDirectoryUpdate);
      socket.off('staff:association_created', handleStaffAssociationUpdate);
      socket.off('staff:association_accepted', handleStaffAssociationUpdate);
      socket.off('staff:association_rejected', handleStaffAssociationUpdate);
      socket.off('staff:association_removed', handleStaffAssociationUpdate);
      socket.off('staff:unit_association_requested', handleStaffAssociationUpdate);
      socket.off('staff:attendance_updated', handleStaffAttendanceUpdate);
      socket.off('staff:entry', handleStaffAttendanceUpdate);
      socket.off('staff:exit', handleStaffAttendanceUpdate);
      socket.off('NOTICE_CREATED', handleNoticeUpdate);
      socket.off('NOTICE_UPDATED', handleNoticeUpdate);
      socket.off('COMMUNITY_NOTE_CREATED', handleCommunityNoteUpdate);
      socket.off('RECORD_UPDATED');
      Object.values(debounceTimersRef.current).forEach((timer) => clearTimeout(timer));
      debounceTimersRef.current = {};
    };
  }, [socket, isAuthenticated, dispatch]);
};

export default useGlobalAppSocket;
