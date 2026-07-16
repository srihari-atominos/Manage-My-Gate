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

const HeroLiabilityBanner = memo(() => {
  const [isClearing, setIsClearing] = useState(false);
  const d = MOCK_LIABILITY;

  return (
    <div className={`hero-liability-card${isClearing ? ' hero-liability-card--clearing' : ''}`}>

      {/* Top label */}
      <div className="hero-liability-card__eyebrow">
        <i className="fa-solid fa-wallet me-2" />
        Outstanding Balance
      </div>

      {/* Big amount */}
      <div className="hero-liability-card__amount">
        <span className="hero-liability-card__currency">{d.currency}</span>
        {d.totalOutstanding.toLocaleString('en-IN')}
      </div>

      {/* Breakdown */}
      <div className="hero-liability-card__breakdown">
        <div className="hero-liability-card__breakdown-row">
          <span className="hero-liability-card__breakdown-label">
            <i className="fa-solid fa-circle-dot me-2 opacity-50" />
            Base Maintenance
          </span>
          <span className="hero-liability-card__breakdown-value">
            {d.currency}{d.baseMaintenance.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="hero-liability-card__breakdown-row">
          <span className="hero-liability-card__breakdown-label">
            <i className="fa-solid fa-circle-dot me-2 opacity-50" />
            Carried-forward Arrears
          </span>
          <span className="hero-liability-card__breakdown-value">
            {d.currency}{d.carriedArrears.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Clearing message — shown when isClearing */}
      {isClearing && (
        <div className="hero-liability-card__clearing-msg">
          <i className="fa-solid fa-clock-rotate-left hero-liability-card__clearing-icon" />
          <span>
            Payment of {d.currency}{d.clearingAmount.toLocaleString('en-IN')} is currently
            clearing via Bank Cheque {d.clearingCheque}.
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="hero-liability-card__actions">
        <button
          type="button"
          className="hero-liability-card__pay-btn"
          disabled={isClearing}
          onClick={() => console.log('[HeroLiabilityBanner] Pay Now clicked')}
        >
          {isClearing
            ? <><i className="fa-solid fa-spinner fa-spin me-2" />Processing…</>
            : <><i className="fa-solid fa-bolt me-2" />Pay Now — {d.currency}{d.totalOutstanding.toLocaleString('en-IN')}</>
          }
        </button>

        {/* Demo toggle — lets reviewer simulate the clearing state */}
        <button
          type="button"
          className="hero-liability-card__toggle-demo"
          onClick={() => setIsClearing(prev => !prev)}
          title="Toggle clearing state (demo only)"
        >
          <i className={`fa-solid ${isClearing ? 'fa-eye-slash' : 'fa-eye'} me-1`} />
          {isClearing ? 'Exit Clearing Preview' : 'Preview Clearing State'}
        </button>
      </div>

    </div>
  );
});
HeroLiabilityBanner.displayName = 'HeroLiabilityBanner';

export default HeroLiabilityBanner;
