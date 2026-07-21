import React, { memo, useEffect, useMemo } from 'react';
import HeroLiabilityBanner  from '../components/HeroLiabilityBanner';
import TenantComplianceBadge from '../components/TenantComplianceBadge';
import { useBilling } from '../hooks/useBilling';
import '../styles/_billing.scss';

/**
 * ResidentActionCenterView
 *
 * Mobile-first financial command center for residents (owners + tenants).
 * Renders the HeroLiabilityBanner and TenantComplianceBadge in a responsive grid.
 */
const ResidentActionCenterView = memo(() => {
  const {
    activeDues,
    loadResidentDues,
    settleOffline,
    walletBalance,
    payInvoiceWallet,
    payInvoiceRazorpay,
    verifyRazorpay,
    loadingStates,
  } = useBilling();

  useEffect(() => {
    loadResidentDues();
  }, [loadResidentDues]);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  if (loadingStates.fetchDues && (!activeDues?.unitBreakdown?.length && !activeDues?.secondaryCompliance?.length)) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading financials...</span>
        </div>
        <span className="text-muted mt-3" style={{ fontSize: '13px', fontWeight: '600' }}>Fetching outstanding dues...</span>
      </div>
    );
  }

  return (
    <div className="billing-os-theme resident-action-center">

      <div className="resident-action-center__header">
        <div className="resident-action-center__header-left">
          <h4 className="resident-action-center__title">My Financials</h4>
          <p className="resident-action-center__sub">
            Current billing status and outstanding dues for your units.
          </p>
        </div>
        <div className="resident-action-center__period-badge">
          <i className="fa-solid fa-calendar-days me-2" />
          {currentPeriod}
        </div>
      </div>

      <div className="resident-action-center__grid">
        {/* Column 1 — Hero card (left / top on mobile) */}
        <div className="resident-action-center__col resident-action-center__col--hero">
          <HeroLiabilityBanner
            activeDues={activeDues}
            settleOffline={settleOffline}
            walletBalance={walletBalance}
            payInvoiceWallet={payInvoiceWallet}
            payInvoiceRazorpay={payInvoiceRazorpay}
            verifyRazorpay={verifyRazorpay}
            loadingStates={loadingStates}
          />
        </div>

        {/* Column 2 — Tenant compliance (right / bottom on mobile) */}
        <div className="resident-action-center__col resident-action-center__col--compliance">
          <TenantComplianceBadge activeDues={activeDues} />
        </div>
      </div>

    </div>
  );
});


ResidentActionCenterView.displayName = 'ResidentActionCenterView';

export default ResidentActionCenterView;
