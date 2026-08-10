import React from 'react';
import { useSelector } from 'react-redux';
import { usePlatformQuote } from '../hooks/usePlatformQuote.js';

const InstantQuoteAction = ({ quoteId, payload }) => {
  const { loading, orderStatus, generateOrder } = usePlatformQuote();
  
  // Find if an accepted quote already exists for this inquiryId (quoteId prop)
  const quotes = useSelector(state => {
    const rawQuotes = state.platformBilling?.quotes;
    if (!rawQuotes) return [];
    return Array.isArray(rawQuotes) ? rawQuotes : (rawQuotes.data || rawQuotes.docs || []);
  });

  const existingAcceptedQuote = quotes.find(q => {
    if (!q || !q.inquiryId) return false;
    const qInquiryStr = String(q.inquiryId._id || q.inquiryId.id || q.inquiryId);
    const targetInquiryStr = String(quoteId?._id || quoteId?.id || quoteId);
    return qInquiryStr === targetInquiryStr && (q.status === 'ACCEPTED' || q.status === 'PROVISIONING');
  });

  const isOrderGenerated = orderStatus === 'PAYMENT_PENDING' || orderStatus === 'PROVISIONING' || orderStatus === 'TRIAL_PENDING' || !!existingAcceptedQuote;

  const handleDispatchOrder = () => {
    if (window.confirm("Are you sure you want to generate the order and start the trial? This will create an invoice and a Razorpay payment link.")) {
      generateOrder(quoteId, payload);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
      {isOrderGenerated ? (
        <div className="alert alert-info" style={{ width: '100%', textAlign: 'center' }}>
          <strong>Order Generated!</strong>
          <p style={{ margin: '5px 0' }}>The Razorpay Payment Link has been generated and sent to the customer.</p>
          <p style={{ margin: '0' }}>You can track payment in <strong>Payment & Invoice</strong> and tenant status in <strong>Provisioning Pipeline</strong>.</p>
        </div>
      ) : (
        <>
          <button
            onClick={() => {}}
            disabled={loading}
            className="btn"
            style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #ced4da', color: '#495057', fontWeight: 'bold', padding: '12px' }}
          >
            Save Draft
          </button>
          <button
            onClick={handleDispatchOrder}
            disabled={loading}
            className="btn btn-primary"
            style={{ flex: 1, fontWeight: 'bold', padding: '12px', backgroundColor: '#007bff', color: '#fff', border: 'none' }}
          >
            {loading ? 'Processing...' : 'Generate & Start Trial'}
          </button>
        </>
      )}
    </div>
  );
};

export default InstantQuoteAction;
