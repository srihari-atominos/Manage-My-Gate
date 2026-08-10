import React from 'react';
import { usePlatformBilling } from "../../hooks/usePlatformBilling.js";

const PlatformQuotesView = () => {
  const { quotes } = usePlatformBilling();

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>Platform Quotes</h1>
          <div className="sub">Pricing breakdown snapshots including Free Trial terms.</div>
        </div>
      </div>
      <div className="panel panel-body table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Organization</th>
              <th>Trial Duration</th>
              <th>Post-Trial Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((item) => (
              <tr key={item._id || item.id}>
                <td>{item.quoteNumber || item._id}</td>
                <td>{item.organizationName || item.organisationId?.name || item.organisationId || item.org}</td>
                <td><span className={`badge ${item.trialDays > 0 ? 'blue' : 'gray'}`}>{item.trialDays ? `${item.trialDays} Days` : 'No Trial'}</span></td>
                <td>₹{(item.totalAmount || item.grandTotal || 0).toLocaleString('en-IN')}</td>
                <td><span className="badge green">{item.status}</span></td>
                <td>
                  <button className={`btn small ${item.status === 'TRIAL_ACTIVE' || item.status === 'DRAFT' ? 'primary' : ''}`}>
                    {item.status === 'TRIAL_ACTIVE' ? 'Convert to Paid' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr><td colSpan="6">No quotes found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PlatformQuotesView;
