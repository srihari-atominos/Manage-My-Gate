import React from 'react';
import { usePlatformBilling } from "../../hooks/usePlatformBilling.js";

const SubscriptionManagerView = () => {
  const { subscriptions } = usePlatformBilling();

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>Active Subscriptions</h1>
          <div className="sub">Tenant feature access, trialing states, and billing periods.</div>
        </div>
      </div>

      <div className="panel panel-body table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Organization ID</th>
              <th>Plan Type</th>
              <th>Trial Period</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((item, idx) => (
              <tr key={item._id || idx}>
                <td>{item.organisationId?.name || item.organisationId || item.organizationId || item.org}</td>
                <td>{item.planName || item.tier || item.planId || item.plan}</td>
                <td>{item.trialEndDate || item.currentPeriodEnd ? `Ends ${new Date(item.trialEndDate || item.currentPeriodEnd).toLocaleDateString()}` : (item.trial || 'No Trial')}</td>
                <td><span className="badge green">{item.status}</span></td>
                <td>
                  <button className={`btn small ${item.status === 'TRIALING' ? 'primary' : ''}`}>
                    {item.status === 'TRIALING' ? 'Extend Trial' : 'View Entitlements'}
                  </button>
                </td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr><td colSpan="5">No subscriptions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SubscriptionManagerView;
