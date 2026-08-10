/**
 * Billing Data Utility Functions
 */

export type InvoiceStatus = 'PAID' | 'UNPAID' | 'VERIFICATION_PENDING' | 'OVERDUE' | 'CANCELLED';

export interface StatusBadgeConfig {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'critical';
}

/**
 * Maps raw invoice status string to catalog StatusBadge variant & label
 */
export const getStatusBadgeConfig = (status: string): StatusBadgeConfig => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return { label: 'Paid', variant: 'success' };
    case 'VERIFICATION_PENDING':
      return { label: 'In Review', variant: 'warning' };
    case 'OVERDUE':
      return { label: 'Overdue', variant: 'danger' };
    case 'UNPAID':
      return { label: 'Unpaid', variant: 'critical' };
    case 'CANCELLED':
      return { label: 'Cancelled', variant: 'neutral' };
    default:
      return { label: status || 'Unknown', variant: 'neutral' };
  }
};

/**
 * Formats a numeric amount into localized currency string (e.g. ₹ 1,500.00)
 */
export const formatCurrency = (amount: number = 0, currencySymbol: string = '₹'): string => {
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  return `${currencySymbol} ${formattedNumber}`;
};

/**
 * Formats ISO date string to readable format (e.g. 15 Aug 2026)
 */
export const formatBillingDate = (dateString?: string): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

/**
 * Computes itemized breakdown array for invoice line items
 */
export interface LineItemBreakdown {
  label: string;
  amount: number;
  description?: string;
}

export const calculateInvoiceBreakdown = (invoice: any): LineItemBreakdown[] => {
  if (!invoice) return [];
  
  if (Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0) {
    return invoice.lineItems.map((item: any) => ({
      label: item.title || item.name || 'Charge',
      amount: item.amount || 0,
      description: item.description,
    }));
  }

  // Default breakdown fallback if single gross amount provided
  const baseAmount = invoice.baseAmount || invoice.amount || 0;
  const taxAmount = invoice.taxAmount || 0;
  const items: LineItemBreakdown[] = [
    { label: 'Maintenance & Assessment Fee', amount: baseAmount },
  ];

  if (taxAmount > 0) {
    items.push({ label: 'Applicable Taxes / GST', amount: taxAmount });
  }

  return items;
};
