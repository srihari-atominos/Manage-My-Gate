import React, { memo } from 'react';
import { formatCurrency } from '../../utils/amenityUtils.js';

const BookingPricing = memo(({ draft }) => {
  return (
    <div className="bg-body-secondary p-4 rounded mb-4">
      <h6 className="fw-bold mb-3 text-uppercase text-muted" >Pricing Breakdown</h6>
      
      <div className="d-flex justify-content-between mb-2">
        <span className="text-muted">Slot Price</span>
        <span>{formatCurrency(draft.price || 0)}</span>
      </div>
      
      {draft.deposit > 0 && (
        <div className="d-flex justify-content-between mb-2">
          <span className="text-muted">Security Deposit</span>
          <span>{formatCurrency(draft.deposit)}</span>
        </div>
      )}
      
      <hr />
      
      <div className="d-flex justify-content-between align-items-center">
        <span className="fw-bold fs-5">Total</span>
        <span className="fw-bold fs-4 text-primary">{formatCurrency(draft.totalPrice)}</span>
      </div>
    </div>
  );
});

export default BookingPricing;
