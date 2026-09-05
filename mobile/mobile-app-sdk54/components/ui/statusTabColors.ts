/**
 * Centralized semantic color tokens and styles for Status Tabs & Filter Pills.
 * Standardizes All, Active, Pending, Revoked, Expired, and related lifecycle statuses.
 */

export type StatusSemanticType =
  | 'all'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'default';

export interface StatusTabStyle {
  containerClass: string;
  textClass: string;
}

const STATUS_SEMANTIC_MAP: Record<string, StatusSemanticType> = {
  // All / Overview
  ALL: 'all',
  'ALL BOOKINGS': 'all',
  'ALL LOGS': 'all',
  'ALL STATEMENTS': 'all',
  'ALL PASSES': 'all',
  'ALL STATUSES': 'all',
  'ALL TYPES': 'all',

  // Active / Approved / Positive / Entry
  ACTIVE: 'success',
  CONFIRMED: 'success',
  APPROVED: 'success',
  CHECKED_IN: 'success',
  PAID: 'success',
  CREDIT: 'success',
  ENTRY: 'success',
  OPEN: 'success',
  RESOLVED: 'success',
  SUCCESS: 'success',

  // Pending / In Progress / Warning
  PENDING: 'warning',
  UPCOMING: 'warning',
  OVERSTAYED: 'warning',
  ASSIGNED: 'warning',
  'IN PROGRESS': 'warning',
  IN_PROGRESS: 'warning',
  HOLD: 'warning',
  ESCALATE: 'warning',
  WARNING: 'warning',

  // Revoked / Blocked / Rejected / Destructive / Exit
  REVOKED: 'danger',
  BLOCKED: 'danger',
  REJECTED: 'danger',
  DENIED: 'danger',
  CANCELLED: 'danger',
  CANCELED: 'danger',
  DEBIT: 'danger',
  EXIT: 'danger',
  UNPAID: 'danger',
  ERROR: 'danger',

  // Expired / Completed / Inactive / Neutral Gray
  EXPIRED: 'neutral',
  COMPLETED: 'neutral',
  INACTIVE: 'neutral',
  CLOSED: 'neutral',
  REFUNDED: 'neutral',
  MANUAL: 'neutral',
  LOW: 'neutral',
  // Notice Board Categories
  EMERGENCY: 'danger',
  MAINTENANCE: 'warning',
  EVENTS: 'success',
  MEETINGS: 'all',
  GENERAL: 'all',

  // Billing / Task Types
  RECURRING: 'all',
  'ONE TIME': 'all',
  'CAPITAL REPAIR': 'warning',
  'IN HOUSE': 'success',
  VENDOR: 'warning',
};

export function getStatusSemanticType(keyOrLabel: string): StatusSemanticType {
  if (!keyOrLabel) return 'default';
  const normalized = keyOrLabel.trim().toUpperCase().replace(/[\-_]+/g, ' ');
  
  if (STATUS_SEMANTIC_MAP[normalized]) {
    return STATUS_SEMANTIC_MAP[normalized];
  }

  // Prefix/Sub-string match fallback for composite labels (e.g. "Top-Ups (+)", "Bookings (-)")
  if (normalized.startsWith('ALL') || normalized === 'TOTAL') return 'all';
  if (normalized.includes('ACTIVE') || normalized.includes('CONFIRM') || normalized.includes('APPROV') || normalized.includes('TOP UP')) {
    return 'success';
  }
  if (normalized.includes('PENDING') || normalized.includes('UPCOMING') || normalized.includes('WAIT') || normalized.includes('HOLD')) {
    return 'warning';
  }
  if (normalized.includes('REVOKE') || normalized.includes('BLOCK') || normalized.includes('REJECT') || normalized.includes('DENI') || normalized.includes('CANCEL') || normalized.includes('EMERGENCY')) {
    return 'danger';
  }
  if (normalized.includes('EXPIRE') || normalized.includes('COMPLET') || normalized.includes('INACTIVE') || normalized.includes('CLOSE')) {
    return 'neutral';
  }

  return 'default';
}

export function getStatusTabStyle(keyOrLabel: string, isSelected: boolean): StatusTabStyle {
  const semantic = getStatusSemanticType(keyOrLabel);

  switch (semantic) {
    case 'all':
      return {
        containerClass: isSelected
          ? 'bg-blue-600 border-blue-600'
          : 'bg-blue-500/10 border-blue-500/30 active:bg-blue-500/20',
        textClass: isSelected
          ? 'text-white font-bold'
          : 'text-blue-600 dark:text-blue-400 font-medium',
      };

    case 'success':
      return {
        containerClass: isSelected
          ? 'bg-emerald-600 border-emerald-600'
          : 'bg-emerald-500/10 border-emerald-500/30 active:bg-emerald-500/20',
        textClass: isSelected
          ? 'text-white font-bold'
          : 'text-emerald-600 dark:text-emerald-400 font-medium',
      };

    case 'warning':
      return {
        containerClass: isSelected
          ? 'bg-amber-500 border-amber-500'
          : 'bg-amber-500/10 border-amber-500/30 active:bg-amber-500/20',
        textClass: isSelected
          ? 'text-white font-bold'
          : 'text-amber-600 dark:text-amber-400 font-medium',
      };

    case 'danger':
      return {
        containerClass: isSelected
          ? 'bg-red-600 border-red-600'
          : 'bg-red-500/10 border-red-500/30 active:bg-red-500/20',
        textClass: isSelected
          ? 'text-white font-bold'
          : 'text-red-600 dark:text-red-400 font-medium',
      };

    case 'neutral':
      return {
        containerClass: isSelected
          ? 'bg-slate-600 border-slate-600'
          : 'bg-slate-500/10 border-slate-500/30 active:bg-slate-500/20',
        textClass: isSelected
          ? 'text-white font-bold'
          : 'text-slate-600 dark:text-slate-400 font-medium',
      };

    case 'default':
    default:
      return {
        containerClass: isSelected
          ? 'bg-blue-600 border-blue-600'
          : 'bg-muted/60 border-border active:bg-muted',
        textClass: isSelected
          ? 'text-white font-bold'
          : 'text-muted-foreground font-medium',
      };
  }
}

export function getStatusUnderlineTabStyle(
  keyOrLabel: string,
  isActive: boolean
): { borderClass: string; textClass: string } {
  const semantic = getStatusSemanticType(keyOrLabel);

  if (!isActive) {
    return {
      borderClass: 'border-transparent',
      textClass: 'text-slate-500 dark:text-slate-400 font-medium',
    };
  }

  switch (semantic) {
    case 'all':
      return { borderClass: 'border-blue-600', textClass: 'text-blue-600 dark:text-blue-400 font-bold' };
    case 'success':
      return { borderClass: 'border-emerald-600', textClass: 'text-emerald-600 dark:text-emerald-400 font-bold' };
    case 'warning':
      return { borderClass: 'border-amber-500', textClass: 'text-amber-600 dark:text-amber-400 font-bold' };
    case 'danger':
      return { borderClass: 'border-red-600', textClass: 'text-red-600 dark:text-red-400 font-bold' };
    case 'neutral':
      return { borderClass: 'border-slate-500', textClass: 'text-slate-600 dark:text-slate-400 font-bold' };
    case 'default':
    default:
      return { borderClass: 'border-primary', textClass: 'text-primary font-bold' };
  }
}
