import React, { memo, useEffect } from 'react'
import BillingLedgerTable from '../components/BillingLedgerTable.jsx'
import { useBilling } from '../hooks/useBilling'
import '../styles/_billing.scss'

/**
 * BillingDashboardView
 *
 * Admin dashboard tab — community billing ledger with KPI strip and data grid.
 */
const BillingDashboardView = memo(() => {
  const billingData = useBilling()

  const {
    kpis,
    invoicesList,
    pagination,
    loadingStates,
    activeOrgId,
    loadAdminDashboard,
    changeTablePage,
    settleOffline,
    approveOffline,
  } = billingData

  useEffect(() => {
    if (activeOrgId) {
      loadAdminDashboard(activeOrgId)
      changeTablePage(1)
    }
  }, [activeOrgId, loadAdminDashboard, changeTablePage])

  return (
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

      <BillingLedgerTable
        kpis={kpis}
        invoices={invoicesList}
        pagination={pagination}
        loading={loadingStates.fetchGrid || loadingStates.fetchKPIs}
        onPageChange={changeTablePage}
        onSettleOffline={settleOffline}
        onApproveOffline={approveOffline}
      />
    </div>
  )
})

BillingDashboardView.displayName = 'BillingDashboardView'

export default BillingDashboardView
