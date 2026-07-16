import React, { memo } from 'react';

/**
 * TenantComplianceBadge
 *
 * Secondary card for owners viewing their leased villa's tenant arrear status.
 * Displays tenant name, unit, outstanding amount, and days until due.
 *
 * Props: sourced entirely from local mock data — no API wiring.
 */

// ── Mock data ─────────────────────────────────────────────────────────────

const MOCK_TENANT_ARREARS = [
  {
    _id: 't1',
    tenantName:  'John Mathews',
    unit:        'Villa A-104',
    amount:       7000,
    currency:    '₹',
    daysUntilDue: 3,
    status:      'UNPAID',
  },
  {
    _id: 't2',
    tenantName:  'Sara Al-Zaabi',
    unit:        'Villa B-201',
    amount:       5500,
    currency:    '₹',
    daysUntilDue: 10,
    status:      'UNPAID',
  },
];

// ── Sub-component ─────────────────────────────────────────────────────────

const ArrearPill = memo(({ arrear }) => {
  const isUrgent = arrear.daysUntilDue <= 5;
  return (
    <div className={`tenant-compliance-card__arrear-row${isUrgent ? ' tenant-compliance-card__arrear-row--urgent' : ''}`}>
      {/* Tenant avatar placeholder */}
      <div className="tenant-compliance-card__avatar">
        {arrear.tenantName.charAt(0)}
      </div>

      <div className="tenant-compliance-card__detail">
        <div className="tenant-compliance-card__name">{arrear.tenantName}</div>
        <div className="tenant-compliance-card__unit">{arrear.unit}</div>
      </div>

      <div className="text-end">
        <div className="tenant-compliance-card__amount">
          {arrear.currency}{arrear.amount.toLocaleString('en-IN')}
        </div>
        <span className={`tenant-compliance-card__warning-pill${isUrgent ? ' tenant-compliance-card__warning-pill--urgent' : ''}`}>
          <i className={`fa-solid ${isUrgent ? 'fa-triangle-exclamation' : 'fa-clock'} me-1`} />
          Due in {arrear.daysUntilDue} {arrear.daysUntilDue === 1 ? 'day' : 'days'}
        </span>
      </div>
    </div>
  );
});
ArrearPill.displayName = 'ArrearPill';

// ── Main component ────────────────────────────────────────────────────────

const TenantComplianceBadge = memo(() => (
  <div className="tenant-compliance-card">

    <div className="tenant-compliance-card__header">
      <div className="tenant-compliance-card__header-icon">
        <i className="fa-solid fa-person-shelter" />
      </div>
      <div>
        <h5 className="tenant-compliance-card__title">Tenant Arrears</h5>
        <p className="tenant-compliance-card__sub">
          Maintenance dues for your leased units
        </p>
      </div>
    </div>

    <div className="tenant-compliance-card__list">
      {MOCK_TENANT_ARREARS.map(arrear => (
        <ArrearPill key={arrear._id} arrear={arrear} />
      ))}
    </div>

    <div className="tenant-compliance-card__footer-note">
      <i className="fa-solid fa-circle-info me-2" />
      As the owner, you may be held liable if tenant dues remain unpaid beyond 30 days.
    </div>

  </div>
));
TenantComplianceBadge.displayName = 'TenantComplianceBadge';

export default TenantComplianceBadge;
