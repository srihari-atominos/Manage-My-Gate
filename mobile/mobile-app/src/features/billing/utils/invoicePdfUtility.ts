import { Invoice } from '../types';

export interface GenerateInvoiceHtmlOptions {
  communityName?: string;
  communityAddress?: string;
  residentName?: string;
}

/**
 * Mobile HTML Invoice Template Generator
 * Produces an Expo-compatible HTML string for printing or PDF rendering.
 */
export function generateInvoiceHtml(item: Invoice | any, options: GenerateInvoiceHtmlOptions = {}): string {
  const communityName = options.communityName || 'ManageMyGate Community';
  const communityAddress = options.communityAddress || '';

  const invoiceNum = item.invoiceNumber || item.invoiceId || item._id || '—';
  const unitNumber = item.unitNumber || '—';
  const unitType = item.type || '';
  const billingPeriod = item.billingPeriodString || '—';
  const assessmentName = item.assessmentName || 'Maintenance';
  const residentName = options.residentName || item.residentName || item.targetUser || '—';
  const status = (item.status || 'UNKNOWN').replace(/_/g, ' ');
  const invoiceDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const currentCharge = item.currentCharge || item.totalDue || item.amount || 0;
  const previousOutstanding = item.previousOutstanding || 0;
  const lateFee = item.lateFeeAmount || 0;
  const totalDue = item.totalDue || item.amount || 0;
  const paidAmount = item.paidAmount || 0;
  const outstanding = item.outstandingAmount ?? totalDue;
  const paymentMethod = item.paymentMethod || '—';
  const offlineRef = item.offlineReference || '—';

  let statusBg = '#F1F5F9';
  let statusColor = '#64748B';
  let statusBorder = '#E2E8F0';

  if (item.status === 'PAID') {
    statusBg = '#D1FAE5';
    statusColor = '#065F46';
    statusBorder = '#86EFAC';
  } else if (item.status === 'PARTIALLY_PAID' || item.status === 'VERIFICATION_PENDING') {
    statusBg = '#FEF3C7';
    statusColor = '#92400E';
    statusBorder = '#FCD34D';
  } else if (item.status === 'UNPAID' || item.status === 'OVERDUE') {
    statusBg = '#FEE2E2';
    statusColor = '#991B1B';
    statusBorder = '#FCA5A5';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
  <title>Invoice - ${invoiceNum}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #fff; padding: 20px; }
    .container { max-width: 100%; margin: 0 auto; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; }
    .sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .org { text-align: right; font-size: 14px; font-weight: 700; color: #1e293b; }
    .meta-grid { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 12px; }
    .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
    .value { font-weight: 700; color: #1e293b; font-size: 14px; }
    .status-badge { display: inline-block; margin-top: 8px; padding: 3px 10px; background: ${statusBg}; color: ${statusColor}; font-weight: 700; font-size: 10px; border-radius: 50px; border: 1px solid ${statusBorder}; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    .th { background: #f8fafc; padding: 8px 10px; font-weight: 600; color: #64748b; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .td { padding: 8px 10px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .td-num { text-align: right; }
    .total-row { font-weight: 800; background: #f1f5f9; font-size: 14px; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="title">Invoice / Receipt</div>
        <div class="sub">ManageMyGate Mobile Statement</div>
      </div>
      <div class="org">
        ${communityName}
        ${communityAddress ? `<div class="sub">${communityAddress}</div>` : ''}
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="label">Billed To</div>
        <div class="value">${residentName}</div>
        <div>Unit: ${unitNumber}${unitType ? ' (' + unitType + ')' : ''}</div>
      </div>
      <div style="text-align: right;">
        <div class="label">Invoice Details</div>
        <div>Invoice #: <strong>${invoiceNum}</strong></div>
        <div>Period: ${billingPeriod}</div>
        <div>Date: ${invoiceDate}</div>
        <div class="status-badge">STATUS: ${status}</div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th class="th">Description</th>
          <th class="th td-num">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="td">${assessmentName} (${billingPeriod})</td>
          <td class="td td-num">₹${currentCharge.toLocaleString('en-IN')}</td>
        </tr>
        ${previousOutstanding > 0 ? `
        <tr>
          <td class="td">Previous Arrears</td>
          <td class="td td-num">₹${previousOutstanding.toLocaleString('en-IN')}</td>
        </tr>` : ''}
        ${lateFee > 0 ? `
        <tr>
          <td class="td">Late Fee / Penalty</td>
          <td class="td td-num">₹${lateFee.toLocaleString('en-IN')}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td class="td">Total Billed:</td>
          <td class="td td-num">₹${totalDue.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td class="td" style="color: #065f46; font-weight: 600;">Amount Paid:</td>
          <td class="td td-num" style="color: #065f46; font-weight: 600;">-₹${paidAmount.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="total-row" style="background: #0f172a; color: #fff;">
          <td class="td" style="color: #fff;">Balance Due:</td>
          <td class="td td-num" style="color: #fff;">₹${outstanding.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    ${paymentMethod !== '—' ? `
    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 11px; margin-bottom: 20px;">
      <strong>Payment Info:</strong> Method: ${paymentMethod} | Reference: ${offlineRef}
    </div>` : ''}

    <div class="footer">
      <p>Computer-generated mobile receipt. Managed securely via ManageMyGate.</p>
    </div>
  </div>
</body>
</html>`;
}
