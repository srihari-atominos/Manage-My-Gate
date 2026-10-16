import NetInfo, { type NetInfoSubscription } from '@react-native-community/netinfo';

export type NetworkIssue = 'offline' | 'backend_unavailable' | 'timeout' | null;

export interface NetworkStatus {
  isOnline: boolean;
  issue: NetworkIssue;
  recoveredAt: number | null;
}

type Listener = () => void;

let status: NetworkStatus = { isOnline: true, issue: null, recoveredAt: null };
let subscription: NetInfoSubscription | null = null;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener());

const update = (next: Partial<NetworkStatus>) => {
  const previous = status;
  status = { ...status, ...next };
  if (previous.isOnline !== status.isOnline || previous.issue !== status.issue || previous.recoveredAt !== status.recoveredAt) {
    notify();
  }
};

const applyNetInfoState = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
  const isOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;
  const cameBackOnline = !status.isOnline && isOnline;
  update({
    isOnline,
    // A restored device connection does not prove the backend is healthy. The next successful API
    // response clears a backend error, while the banner stays honest during the transition.
    issue: isOnline ? (status.issue === 'offline' ? null : status.issue) : 'offline',
    recoveredAt: cameBackOnline ? Date.now() : status.recoveredAt,
  });
};

export const startNetworkMonitoring = () => {
  if (subscription) return subscription;
  subscription = NetInfo.addEventListener(applyNetInfoState);
  return subscription;
};

/** Re-check device connectivity without issuing an API request. */
export const refreshNetworkStatus = async () => {
  const nextState = await NetInfo.fetch();
  applyNetInfoState(nextState);
  return getNetworkStatus();
};

export const stopNetworkMonitoring = () => {
  subscription?.();
  subscription = null;
};

export const getNetworkStatus = () => status;
export const subscribeNetworkStatus = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const reportApiSuccess = () => {
  if (status.isOnline && status.issue !== null) update({ issue: null });
};

export const reportApiFailure = (issue: Exclude<NetworkIssue, 'offline' | null>) => {
  if (status.isOnline) update({ issue });
};

export const isNetworkFailure = (error: any) =>
  !error?.response && (error?.code === 'ECONNABORTED' || error?.message === 'Network Error' || Boolean(error?.request));

export const isTimeoutFailure = (error: any) =>
  error?.code === 'ECONNABORTED' || String(error?.message || '').toLowerCase().includes('timeout');

export const isConnectivityErrorMessage = (message: unknown) => {
  const text = String(message || '').toLowerCase();
  return (
    text.includes("you're offline") ||
    text.includes('unable to connect') ||
    text.includes('request took too long') ||
    text.includes('network error') ||
    text.includes('service is temporarily unavailable') ||
    text.includes('connection is taking longer') ||
    text.includes('check your connection')
  );
};

export const getSafeApiErrorMessage = (error: any): string => {
  if (!getNetworkStatus().isOnline) return "You're offline. Check your connection and try again.";
  if (isTimeoutFailure(error)) return 'The request took too long. Please try again.';
  if (isNetworkFailure(error)) return 'Unable to connect. Please try again.';

  const statusCode = error?.response?.status;
  if (statusCode === 401) return 'Your session has expired. Please sign in again.';
  if (statusCode === 403) return "You don't have permission to perform this action.";
  if (statusCode === 404) return 'The requested information is no longer available.';
  if (statusCode === 422) return error?.response?.data?.message || 'Please review the entered information.';
  if (statusCode >= 500) return 'We could not complete your request. Please try again.';
  return error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';
};