import React, { memo } from 'react';
import HeroLiabilityBanner  from '../components/HeroLiabilityBanner';
import TenantComplianceBadge from '../components/TenantComplianceBadge';
import '../styles/_billing.scss';

/**
 * ResidentActionCenterView
 *
 * Mobile-first financial command center for residents (owners + tenants).
 * Renders the HeroLiabilityBanner and TenantComplianceBadge in a responsive grid.
 * Zero API / Redux wiring — all data sourced from component-level mock.
 */
const ResidentActionCenterView = memo(() => (
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
        July 2026
      </div>
    </div>

    <div className="resident-action-center__grid">
      {/* Column 1 — Hero card (left / top on mobile) */}
      <div className="resident-action-center__col resident-action-center__col--hero">
        <HeroLiabilityBanner />
      </div>

      {/* Column 2 — Tenant compliance (right / bottom on mobile) */}
      <div className="resident-action-center__col resident-action-center__col--compliance">
        <TenantComplianceBadge />
      </div>
    </div>

  </div>
));
ResidentActionCenterView.displayName = 'ResidentActionCenterView';

export default ResidentActionCenterView;
