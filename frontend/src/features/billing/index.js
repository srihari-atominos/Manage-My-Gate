// Public Feature API exports for billing module

export { default as billingService } from './services/billing.service.js'

export {
  fetchAdminKPIs,
  fetchMyDues,
  fetchInvoicesGrid,
  executeManualTrigger,
  submitOfflineSettlement,
  syncRealtimeInvoice,
  clearBillingError,
} from './store/billingSlice.js'

export { default as useBilling } from './hooks/useBilling.js'
export { default as useBillingSocket } from './hooks/useBillingSocket.js'

// Views & Components
export { default as BillingView } from './views/BillingView.jsx'
export { default as BillingTopNav } from './components/BillingTopNav.jsx'
export { default as AssessmentList } from './components/AssessmentList.jsx'
export { default as AssessmentDetail } from './components/AssessmentDetail.jsx'
