import React, { useState, memo } from 'react';
import toast from 'react-hot-toast';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect
} from '@coreui/react';

/**
 * HeroLiabilityBanner
 *
 * Prominent financial summary card for residents.
 * Displays total outstanding liability with a breakdown and Pay Now CTA.
 * Supports an "interim clearing" state that disables the button and shows cheque status.
 *
 * Props: all sourced from local mock data — no API wiring.
 */

// ── Mock data ─────────────────────────────────────────────────────────────

const MOCK_LIABILITY = {
  totalOutstanding:  14000,
  baseMaintenance:    7000,
  carriedArrears:     7000,
  currency:          '₹',
  clearingCheque:    '#44892',
  clearingAmount:     7000,
};

// ── Component ─────────────────────────────────────────────────────────────

const HeroLiabilityBanner = memo(({ activeDues = null, settleOffline }) => {
  const totalOutstanding = activeDues?.totalPortfolioDue || 0;
  const unitBreakdown = activeDues?.unitBreakdown || [];

  // Determine if there is any cheque/offline payment currently clearing (VERIFICATION_PENDING)
  const clearingInvoice = unitBreakdown.find(inv => inv.status === 'VERIFICATION_PENDING');
  const isClearing = !!clearingInvoice;
  const clearingAmount = clearingInvoice?.totalDue || 0;
  const clearingRef = clearingInvoice?.offlineReference || 'Cheque';

  const [payInvoice, setPayInvoice] = useState(null);
  const [offlineRef, setOfflineRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CHEQUE');
  const [submitting, setSubmitting] = useState(false);

  const handlePayNow = () => {
    const firstUnpaid = unitBreakdown.find(inv => inv.status === 'UNPAID');
    if (!firstUnpaid) {
      toast.error('You have no outstanding unpaid invoices!');
      return;
    }
    setPayInvoice(firstUnpaid);
    setOfflineRef('');
    setPaymentMethod('CHEQUE');
  };

  const handleConfirmPay = async () => {
    if (!payInvoice || !offlineRef.trim()) return;
    setSubmitting(true);
    try {
      await settleOffline(payInvoice.invoiceId || payInvoice._id, {
        offlineReference: offlineRef,
        paymentMethod: paymentMethod,
      });
      toast.success('Offline payment submitted successfully! Awaiting admin verification.');
      setPayInvoice(null);
    } catch (err) {
      toast.error('Failed to submit offline payment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`hero-liability-card${isClearing ? ' hero-liability-card--clearing' : ''}`}>

      {/* Top label */}
      <div className="hero-liability-card__eyebrow">
        <i className="fa-solid fa-wallet me-2" />
        Outstanding Balance
      </div>

      {/* Big amount */}
      <div className="hero-liability-card__amount">
        <span className="hero-liability-card__currency">₹</span>
        {totalOutstanding.toLocaleString('en-IN')}
      </div>

      {/* Breakdown */}
      <div className="hero-liability-card__breakdown">
        {unitBreakdown.length === 0 ? (
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>
            🎉 No outstanding dues. Good job!
          </div>
        ) : (
          unitBreakdown.map((item) => (
            <div key={item.invoiceId || item._id} className="hero-liability-card__breakdown-row">
              <span className="hero-liability-card__breakdown-label">
                <i className="fa-solid fa-circle-dot me-2 opacity-50" />
                {item.unitNumber || 'Unit'} - Period: {item.billingPeriodString}
              </span>
              <span className="hero-liability-card__breakdown-value">
                ₹{(item.totalDue || 0).toLocaleString('en-IN')}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Clearing message — shown when isClearing */}
      {isClearing && (
        <div className="hero-liability-card__clearing-msg">
          <i className="fa-solid fa-clock-rotate-left hero-liability-card__clearing-icon" />
          <span>
            Payment of ₹{clearingAmount.toLocaleString('en-IN')} is currently
            clearing via Reference {clearingRef}.
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="hero-liability-card__actions">
        <button
          type="button"
          className="hero-liability-card__pay-btn"
          disabled={isClearing || totalOutstanding === 0}
          onClick={handlePayNow}
        >
          {isClearing ? (
            <>
              <i className="fa-solid fa-spinner fa-spin me-2" />
              Processing Clearance…
            </>
          ) : (
            <>
              <i className="fa-solid fa-bolt me-2" />
              Pay Now — ₹{totalOutstanding.toLocaleString('en-IN')}
            </>
          )}
        </button>
      </div>

      {/* ── Pay Now / Record Settlement Modal ─────────────────────────── */}
      <CModal visible={!!payInvoice} onClose={() => setPayInvoice(null)} alignment="center">
        <CModalHeader>
          <CModalTitle className="fw-semibold">Submit Offline Payment Confirmation</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={(e) => { e.preventDefault(); handleConfirmPay(); }}>
          <CModalBody>
            <div className="alert alert-info py-2 px-3 small mb-3">
              You are clearing Invoice <strong>{payInvoice?.invoiceNumber}</strong> of <strong>₹{payInvoice?.totalDue?.toLocaleString('en-IN')}</strong>.
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="pay-method" className="small fw-semibold">Payment Method</CFormLabel>
              <CFormSelect id="pay-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} size="sm">
                <option value="CHEQUE">Cheque</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS/UPI)</option>
              </CFormSelect>
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="pay-ref" className="small fw-semibold">
                Transaction ID / Reference ID *
              </CFormLabel>
              <CFormInput
                id="pay-ref"
                type="text"
                placeholder="e.g. UTR-932842 or CHQ-48192"
                value={offlineRef}
                onChange={(e) => setOfflineRef(e.target.value)}
                required
                autoFocus
                size="sm"
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton type="button" color="secondary" size="sm" onClick={() => setPayInvoice(null)} disabled={submitting}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" size="sm" disabled={submitting || !offlineRef.trim()}>
              {submitting ? 'Submitting...' : 'Submit Confirmation'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

    </div>
  );
});
HeroLiabilityBanner.displayName = 'HeroLiabilityBanner';

export default HeroLiabilityBanner;
