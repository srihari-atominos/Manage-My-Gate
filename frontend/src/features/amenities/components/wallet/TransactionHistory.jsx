import React, { memo, useState } from 'react'
import {
  CCard,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
} from '@coreui/react'

const TransactionHistory = memo(({ transactions = [], loading }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  if (!loading && transactions.length === 0) {
    return (
      <CCard className="border-0 shadow-sm">
        <CCardBody className="text-center p-5 text-muted">
          No transaction history available.
        </CCardBody>
      </CCard>
    )
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <CBadge color="success">Success</CBadge>
      case 'refunded':
        return <CBadge color="info">Refunded</CBadge>
      case 'pending':
        return <CBadge color="warning">Pending</CBadge>
      case 'failed':
        return <CBadge color="danger">Failed</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  const getTypeBadge = (type) => {
    return type === 'Credit' ? (
      <CBadge color="success">Credit</CBadge>
    ) : (
      <CBadge color="danger">Debit</CBadge>
    )
  }

  const totalItems = transactions.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentTransactions = transactions.slice(startIndex, startIndex + itemsPerPage)
  const actualEndIndex = Math.min(startIndex + itemsPerPage, totalItems)

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
            {currentTransactions.map((txn) => (
              <CTableRow key={txn._id}>
                <CTableDataCell className="small">
                  {new Date(txn.createdAt).toLocaleDateString('en-GB')} <br />
                  <span className="text-muted">
                    {new Date(txn.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </CTableDataCell>
                <CTableDataCell
                  className="small fw-bold user-select-all"
                  style={{
                    maxWidth: '120px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {txn.transactionId}
                </CTableDataCell>
                <CTableDataCell className="small text-muted">{txn.bookingId || '-'}</CTableDataCell>
                <CTableDataCell className="fw-semibold">
                  {txn.amenityName || 'Wallet'}
                </CTableDataCell>
                <CTableDataCell>{getTypeBadge(txn.type)}</CTableDataCell>
                <CTableDataCell className="text-capitalize small">
                  {txn.paymentMethod}
                </CTableDataCell>
                <CTableDataCell
                  className={`fw-bold ${txn.type === 'Credit' ? 'text-success' : 'text-danger'}`}
                >
                  {txn.type === 'Credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                </CTableDataCell>
                <CTableDataCell>{getStatusBadge(txn.paymentStatus)}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </CCardBody>

      {totalItems > 0 && (
        <div className="card-footer bg-body border-top d-flex justify-content-between align-items-center p-3">
          <div className="text-muted small">
            {startIndex + 1}-{actualEndIndex} of {totalItems}
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <i className="fa-solid fa-chevron-left"></i> Prev
            </button>
            <button
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </CCard>
  )
})

export default TransactionHistory
