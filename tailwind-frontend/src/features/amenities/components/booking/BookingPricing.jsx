import React, { memo } from 'react';
import { formatCurrency } from '../../utils/amenityUtils.js';

const BookingPricing = memo(({ draft }) => {
  return (
    <div className="bg-slate-50 dark:bg-meta-4/20 p-4 rounded-xl border border-stroke dark:border-strokedark">
      <h6 className="text-2xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Pricing Breakdown</h6>
      
      <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
        <span>Slot Price</span>
        <span className="font-semibold text-black dark:text-white">{formatCurrency(draft.price || 0)}</span>
      </div>
      
      {draft.deposit > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
          <span>Security Deposit</span>
          <span className="font-semibold text-black dark:text-white">{formatCurrency(draft.deposit)}</span>
        </div>
      )}
      
      <hr className="border-stroke dark:border-strokedark my-3" />
      
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-black dark:text-white">Total</span>
        <span className="text-base font-bold text-primary">{formatCurrency(draft.totalPrice)}</span>
      </div>
    </div>
  );
});

export default BookingPricing;
