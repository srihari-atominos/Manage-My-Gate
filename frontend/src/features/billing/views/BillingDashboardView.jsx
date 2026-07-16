import React, { memo } from 'react';
import BillingLedgerTable from '../components/BillingLedgerTable';
import '../styles/_billing.scss';

/**
 * BillingDashboardView
 *
 * Admin dashboard tab — community billing ledger with KPI strip and data grid.
 * Zero API / Redux wiring — all data sourced from BillingLedgerTable's internal mock.
 */
const BillingDashboardView = memo(() => (
  <div className="billing-os-theme billing-dashboard-view">

    <div className="billing-dashboard-view__header">
      <div>
        <h4 className="billing-dashboard-view__title">Billing Ledger</h4>
        <p className="billing-dashboard-view__sub">
          All community invoices for the current billing period.
        </p>
      </div>
      <div className="billing-dashboard-view__header-actions">
        <button type="button" className="billing-dashboard-view__export-btn">
          <i className="fa-solid fa-file-export me-2" />
          Export CSV
        </button>
      </div>
    </div>

    <BillingLedgerTable />

  </div>
));
BillingDashboardView.displayName = 'BillingDashboardView';

export default BillingDashboardView;
