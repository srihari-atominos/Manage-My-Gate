import React from 'react';
import { usePlatformBilling } from "../../hooks/usePlatformBilling.js";

const OrderDetailsView = () => {
  const { orders } = usePlatformBilling();

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>Platform Orders</h1>
          <div className="sub">Immutable financial snapshots supporting Free Trial orders.</div>
        </div>
      </div>

      <div className="panel panel-body table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Organization</th>
              <th>Order Type</th>
              <th>Grand Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((item) => (
              <tr key={item._id || item.id}>
                <td>{item.orderNumber || item._id}</td>
                <td>{item.organizationName || item.organisationId?.name || item.organisationId || item.org}</td>
                <td>{item.orderSnapshot?.tier || item.orderSnapshot?.planName || item.orderType || item.type}</td>
                <td>₹{(item.orderSnapshot?.totalAmount || item.grandTotal || 0).toLocaleString('en-IN')}</td>
                <td><span className="badge green">{item.status}</span></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan="5">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default OrderDetailsView;
