import React, { memo } from 'react';
import { CCard, CCardBody, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CBadge } from '@coreui/react';

const TransactionHistory = memo(({ transactions = [], loading }) => {
  if (!loading && transactions.length === 0) {
    return (
      <CCard className="border-0 shadow-sm">
        <CCardBody className="text-center p-5 text-muted">
          No transaction history available.
        </CCardBody>
      </CCard>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success': return <CBadge color="success">Success</CBadge>;
      case 'refunded': return <CBadge color="info">Refunded</CBadge>;
      case 'pending': return <CBadge color="warning">Pending</CBadge>;
      case 'failed': return <CBadge color="danger">Failed</CBadge>;
      default: return <CBadge color="secondary">{status}</CBadge>;
    }
  };

  const getTypeBadge = (type) => {
    return type === 'Credit' ? <CBadge color="success">Credit</CBadge> : <CBadge color="danger">Debit</CBadge>;
  };

  return (
    <CCard className="border-0 shadow-sm mb-4">
      <CCardBody className="p-0" style={{ overflowX: 'auto' }}>
        <CTable hover align="middle" className="mb-0 border">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell>Date</CTableHeaderCell>
              <CTableHeaderCell>Transaction ID</CTableHeaderCell>
              <CTableHeaderCell>Booking ID</CTableHeaderCell>
              <CTableHeaderCell>Amenity</CTableHeaderCell>
              <CTableHeaderCell>Type</CTableHeaderCell>
              <CTableHeaderCell>Method</CTableHeaderCell>
              <CTableHeaderCell>Amount</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {transactions.map((txn) => (
              <CTableRow key={txn._id}>
                <CTableDataCell className="small">
                  {new Date(txn.createdAt).toLocaleDateString('en-GB')} <br/>
                  <span className="text-muted">{new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </CTableDataCell>
                <CTableDataCell className="small fw-bold user-select-all" style={{ maxWidth: '120px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {txn.transactionId}
                </CTableDataCell>
                <CTableDataCell className="small text-muted">{txn.bookingId || '-'}</CTableDataCell>
                <CTableDataCell className="fw-semibold">{txn.amenityName || 'Wallet'}</CTableDataCell>
                <CTableDataCell>{getTypeBadge(txn.type)}</CTableDataCell>
                <CTableDataCell className="text-capitalize small">{txn.paymentMethod}</CTableDataCell>
                <CTableDataCell className={`fw-bold ${txn.type === 'Credit' ? 'text-success' : 'text-danger'}`}>
                  {txn.type === 'Credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                </CTableDataCell>
                <CTableDataCell>{getStatusBadge(txn.paymentStatus)}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  );
});

export default TransactionHistory;
