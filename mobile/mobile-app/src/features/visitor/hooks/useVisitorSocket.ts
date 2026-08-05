import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { mapBackendWalkInToApprovalItem } from '../utils/mapBackendWalkInToApprovalItem';
import {
  walkInPendingReceived,
  walkInResolvedReceived,
  fetchPendingWalkIns,
  fetchDashboardSummary,
} from '../store/visitorPassSlice';

/**
 * Custom hook encapsulating real-time Socket.IO event listeners for Visitor Management.
 * Listens for backend events (GATE_APPROVAL_REQUEST & GATE_APPROVAL_RESOLVED),
 * updates Redux store idempotently, and triggers background REST recovery on reconnect.
 */
export const useVisitorSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useAppSocket();

  const activeOrgId = useSelector((state: RootState) => {
    const user = (state as any).auth?.user;
    return (
      user?.orgId ||
      user?.organizationId ||
      user?.org?._id ||
      user?.organization?._id ||
      (Array.isArray(user?.availableWorkspaces) && user?.availableWorkspaces[0]?.orgId) ||
      (Array.isArray(user?.availableWorkspaces) && user?.availableWorkspaces[0]?._id) ||
      ''
    );
  });

  useEffect(() => {
    if (!socket) return;

    // 1. Handler for GATE_APPROVAL_REQUEST (Emitted to user:${residentId} when a guard submits a walk-in)
    const handleGateApprovalRequest = (log: any) => {
      if (!log) return;
      if (log.entryType && log.entryType !== 'WALK_IN') return;

      console.log(`[Socket] Received GATE_APPROVAL_REQUEST for log ${log._id}`);
      const mappedItem = mapBackendWalkInToApprovalItem(log);
      dispatch(walkInPendingReceived({ mappedItem, rawLog: log }));
    };

    // 2. Handler for GATE_APPROVAL_RESOLVED (Emitted when a request is resolved)
    const handleGateApprovalResolved = (log: any) => {
      if (!log || !log._id) return;
      console.log(`[Socket] Received GATE_APPROVAL_RESOLVED for log ${log._id}`);
      dispatch(walkInResolvedReceived({ id: log._id }));
    };

    // 3. Handler for Socket reconnect event -> triggers background REST synchronization
    const handleConnect = () => {
      console.log('[Socket] Socket reconnected: triggering background recovery fetch for pending walk-ins');
      if (activeOrgId) {
        dispatch(fetchPendingWalkIns(activeOrgId));
        dispatch(fetchDashboardSummary(activeOrgId));
      }
    };

    // Register event listeners
    socket.on('GATE_APPROVAL_REQUEST', handleGateApprovalRequest);
    socket.on('GATE_APPROVAL_RESOLVED', handleGateApprovalResolved);
    socket.on('connect', handleConnect);

    // Lifecycle cleanup
    return () => {
      socket.off('GATE_APPROVAL_REQUEST', handleGateApprovalRequest);
      socket.off('GATE_APPROVAL_RESOLVED', handleGateApprovalResolved);
      socket.off('connect', handleConnect);
    };
  }, [socket, dispatch, activeOrgId]);
};

export default useVisitorSocket;
