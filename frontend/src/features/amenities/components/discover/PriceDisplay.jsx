import React, { memo } from 'react';
import { formatCurrency } from '../../utils/amenityUtils.js';

const PriceDisplay = memo(({ rate }) => {
  if (!rate || rate === 0) {
    return <span className="fs-5 fw-bold text-success">Free</span>;
  }

  return (
    <div>
      <span className="fs-5 fw-bold text-primary">{formatCurrency(rate)}</span>
      <span className="text-muted small ms-1">/ hour</span>
    </div>
  );
});

export default PriceDisplay;
