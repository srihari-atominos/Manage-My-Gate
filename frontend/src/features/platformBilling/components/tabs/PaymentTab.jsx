import React, { useState } from 'react';

const PaymentTab = ({ postTrialTotal, currentStatus, trialExpiryDate, paymentLink }) => {
  const [copied, setCopied] = useState(false);
  const [reminded, setReminded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemind = () => {
    setReminded(true);
    setTimeout(() => setReminded(false), 3000);
  };

  return (
    <div className="panel-body">
      <div className="cards" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="card shadow-none">
          <div className="kpi-label">Post-Trial Total</div>
          <div className="kpi-value text-lg">₹{(postTrialTotal || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="card shadow-none">
          <div className="kpi-label">Current Status</div>
          <div className="kpi-value text-lg text-primary">{currentStatus}</div>
        </div>
        <div className="card shadow-none">
          <div className="kpi-label">Trial Expiry</div>
          <div className="kpi-value text-lg">{trialExpiryDate}</div>
        </div>
      </div>
      <div className="grid2 mt-3">
        <div className="panel shadow-none">
          <div className="panel-head"><h2>Post-Trial Payment Link</h2></div>
          <div className="panel-body">
            <div className="field">
              <label htmlFor="payLink">Payment Collection Link (Due after Trial)</label>
              <input id="payLink" className="input" value={paymentLink} readOnly />
            </div>
            <div className="actions mt-3">
              <button className="btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button className="btn primary" onClick={handleRemind} disabled={reminded}>
                {reminded ? 'Reminder Sent ✓' : 'Send Payment Reminder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTab;
