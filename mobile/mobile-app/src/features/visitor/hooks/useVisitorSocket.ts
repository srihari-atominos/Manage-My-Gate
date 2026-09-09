import { useEffect } from 'react';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { mapBackendWalkInToApprovalItem } from '../utils/mapBackendWalkInToApprovalItem';
import { selectActiveOrgId } from '../../auth/store/authSelectors';
import { store } from '../../../store/store';
import {
  walkInPendingReceived,
  walkInResolvedReceived,
  fetchPendingWalkIns,
  fetchDashboardSummary,
} from '../store/visitorPassSlice';

let subscriberCount = 0;
let boundSocket: any = null;

const handleGateApprovalRequest = (log: any) => {
  if (!log) return;
  if (log.entryType && log.entryType !== 'WALK_IN') return;

  console.log(`[Socket] Received GATE_APPROVAL_REQUEST for log ${log._id}`);
  const mappedItem = mapBackendWalkInToApprovalItem(log);
  store.dispatch(walkInPendingReceived({ mappedItem, rawLog: log }));
};

const handleGateApprovalResolved = (log: any) => {
  if (!log || !log._id) return;
  console.log(`[Socket] Received GATE_APPROVAL_RESOLVED for log ${log._id}`);
  store.dispatch(walkInResolvedReceived({ id: log._id, rawLog: log }));
};

const handleConnect = () => {
  console.log('[Socket] Socket reconnected: triggering background recovery fetch for pending walk-ins');
  const orgId = selectActiveOrgId(store.getState());
  if (orgId) {
    store.dispatch(fetchPendingWalkIns(orgId));
    store.dispatch(fetchDashboardSummary(orgId));
  }
};

/**
 * Custom hook encapsulating real-time Socket.IO event listeners for Visitor Management.
 * Listens for backend events (GATE_APPROVAL_REQUEST & GATE_APPROVAL_RESOLVED),
 * updates Redux store idempotently, and triggers background REST recovery on reconnect.
 * Deduplicates listener registration so that multiple components calling this hook share a single set of listeners.
 */
export const useVisitorSocket = () => {
  const { socket } = useAppSocket();

  useEffect(() => {
    if (!socket) return;

    subscriberCount++;

    if (subscriberCount === 1 || boundSocket !== socket) {
      if (boundSocket && boundSocket !== socket) {
        boundSocket.off('GATE_APPROVAL_REQUEST', handleGateApprovalRequest);
        boundSocket.off('GATE_APPROVAL_RESOLVED', handleGateApprovalResolved);
        boundSocket.off('connect', handleConnect);
      }

      socket.on('GATE_APPROVAL_REQUEST', handleGateApprovalRequest);
      socket.on('GATE_APPROVAL_RESOLVED', handleGateApprovalResolved);
      socket.on('connect', handleConnect);
      boundSocket = socket;
    }

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      if (subscriberCount === 0 && boundSocket) {
        boundSocket.off('GATE_APPROVAL_REQUEST', handleGateApprovalRequest);
        boundSocket.off('GATE_APPROVAL_RESOLVED', handleGateApprovalResolved);
        boundSocket.off('connect', handleConnect);
        boundSocket = null;
      }
    };
  }, [socket]);
};

export default useVisitorSocket;
