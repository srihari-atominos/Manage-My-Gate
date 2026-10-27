import { type ReportingPeriod } from '../types';

/**
 * Format currency in Indian Rupees (INR)
 */
export const formatINR = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  const numeric = Number(amount);
  const isNegative = numeric < 0;
  const absFormatted = Math.abs(numeric).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  return isNegative ? `-₹${absFormatted}` : `₹${absFormatted}`;
};

/**
 * Helper to format a Date object as YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Calculate startDate and endDate for each standard reporting period in IST
 */
export const getPeriodDateRange = (
  period: ReportingPeriod
): { startDate: string | null; endDate: string | null } => {
  const now = new Date();

  switch (period) {
    case 'Today': {
      const todayStr = formatDate(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case 'This Week': {
      // Monday as first day of week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'This Month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'Last Month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'This Year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'Previous Year': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'All Time':
    default:
      return { startDate: null, endDate: null };
  }
};
