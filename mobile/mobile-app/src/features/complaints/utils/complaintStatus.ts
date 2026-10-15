import type { StatusVariant } from '@/components/ui/StatusBadge';

/** The employee has finished; the resident still has to confirm. */
export const WORK_DONE_STATUSES = ['Completed', 'Work Completed', 'Waiting For Resident Confirmation'];

export const isWorkDone = (status?: string | null): boolean => WORK_DONE_STATUSES.includes(String(status));

export type StatusViewer = 'resident' | 'staff';

/**
 * Status text as the person looking at it should read it. "Completed" is NOT the end of the story for a
 * resident (they still have to confirm), so it must not look like a green "done" badge.
 */
export function getStatusDisplay(
  status: string | undefined,
  viewer: StatusViewer
): { label: string; variant: StatusVariant } {
  if (isWorkDone(status)) {
    return viewer === 'resident'
      ? { label: 'Confirm it is fixed', variant: 'warning' }
      : { label: 'Waiting for resident', variant: 'warning' };
  }
  switch (status) {
    case 'Closed':
      return { label: 'Closed', variant: 'success' };
    case 'Reopened':
      return { label: viewer === 'resident' ? 'Reopened' : 'Reopened: fix again', variant: 'danger' };
    case 'Escalated':
    case 'Rejected':
    case 'Cancelled':
      return { label: status, variant: 'danger' };
    case 'In Progress':
    case 'Assigned':
    case 'Accepted':
      return { label: status, variant: 'info' };
    case 'On Hold':
      return { label: 'On hold', variant: 'warning' };
    default:
      return { label: status || 'Open', variant: 'neutral' };
  }
}

/** Backend errors reach the UI as strings (thunk payload) or Errors; show either as plain text. */
export function errorText(err: unknown, fallback: string): string {
  if (typeof err === 'string' && err.trim()) return err;
  const anyErr = err as any;
  return anyErr?.response?.data?.message || anyErr?.message || fallback;
}
