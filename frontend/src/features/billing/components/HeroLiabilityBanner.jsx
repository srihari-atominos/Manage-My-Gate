import React, { useState, memo } from 'react';

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

  const handlePayNow = async () => {
    const firstUnpaid = unitBreakdown.find(inv => inv.status === 'UNPAID');
    if (!firstUnpaid) {
      alert('You have no outstanding unpaid invoices!');
      return;
    }

    const ref = window.prompt(
      `Enter payment confirmation reference (cheque or NEFT reference) to settle invoice ${firstUnpaid.invoiceNumber} of ₹${firstUnpaid.totalDue.toLocaleString('en-IN')}:`
    );
    if (ref) {
      try {
        await settleOffline(firstUnpaid.invoiceId || firstUnpaid._id, {
          offlineReference: ref,
          paymentMethod: 'CHEQUE',
        });
        alert('Offline payment submitted successfully! Awaiting admin verification.');
      } catch (err) {
        alert('Failed to submit offline payment: ' + err.message);
      }
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

    </div>
  );
});
HeroLiabilityBanner.displayName = 'HeroLiabilityBanner';

export default HeroLiabilityBanner;
