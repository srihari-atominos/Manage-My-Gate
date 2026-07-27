import React from 'react'
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useAdminLedgers } from '../hooks/useAdminLedgers.js'
import '../styles/_amenities.scss'

const AdminLedgersView = () => {
  const { bookings, loading, search, handleSearchChange, pagination, handlePageChange } =
    useAdminLedgers()

  const handleExport = () => {
    const table = document.getElementById('bookings-ledger')
    if (table) {
      const wb = XLSX.utils.table_to_book(table)
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, 'bookings_ledger.xlsx')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>
            <i className="fa-solid fa-check-circle"></i> Confirmed
          </span>
        )
      case 'pending':
        return (
          <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>
            <i className="fa-solid fa-clock"></i> Pending
          </span>
        )
      case 'cancelled':
        return (
          <span
            className="badge"
            style={{ textTransform: 'capitalize', background: '#fee2e2', color: '#ef4444' }}
          >
            <i className="fa-solid fa-times-circle"></i> Cancelled
          </span>
        )
      case 'checked-in':
        return (
          <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
            <i className="fa-solid fa-sign-in-alt"></i> Checked In
          </span>
        )
      case 'completed':
        return (
          <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
            <i className="fa-solid fa-flag-checkered"></i> Completed
          </span>
        )
      default:
        return (
          <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
            {status}
          </span>
        )
    }
  }

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-bookings">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '32px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ marginBottom: '8px' }} className="fs-3">
                  Booking Master Ledger
                </h3>
                <p style={{ color: 'var(--text-muted)' }} className="fw-medium small">
                  Bookings are auto-confirmed via payment gateway. No manual approval required.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div
                  className="search-bar-app"
                  style={{
                    margin: 0,
                    padding: '8px 16px',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid var(--border-light)',
                    borderRadius: '24px',
                    backgroundColor: 'var(--bg-body-secondary)',
                  }}
                >
                  <i
                    className="small fa-solid fa-magnifying-glass"
                    style={{ color: 'var(--text-muted)' }}
                  ></i>
                  <input
                    type="text"
                    id="booking-search"
                    placeholder="Search ID..."
                    value={search}
                    onChange={handleSearchChange}
                    style={{
                      width: '150px',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>
                <button
                  className="fw-semibold btn btn-primary"
                  onClick={handleExport}
                  style={{
                    borderRadius: '24px',
                    padding: '8px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="fa-solid fa-download"></i> Export
                </button>
              </div>
            </div>

            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ent-table" id="bookings-ledger">
                <thead>
                  <tr>
                    <th>BOOKING ID</th>
                    <th>RESIDENT</th>
                    <th>AMENITY & SLOT</th>
                    <th>FINANCIALS</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                        Loading bookings...
                      </td>
                    </tr>
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr key={b._id} data-status={b.status}>
                        <td style={{ color: 'var(--primary)' }} className="fw-bold">
                          #{b.bookingId || b._id.substring(b._id.length - 4).toUpperCase()}
                        </td>
                        <td>
                          <div className="fw-bold">
                            {b.userId?.name || b.userId?.username || 'Unknown Resident'}
                          </div>
                          <div style={{ color: 'var(--text-muted)' }} className="fw-medium small">
                            {b.userId?.flatNumber ? `Flat ${b.userId.flatNumber}` : ''}
                            {b.userId?.building ? `, ${b.userId.building}` : ''}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold">{b.amenityId?.name || 'Unknown Amenity'}</div>
                          <div style={{ color: 'var(--text-muted)' }} className="fw-medium small">
                            {b.bookingDate
                              ? new Date(b.bookingDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: '2-digit',
                                })
                              : ''}{' '}
                            • {b.startTime} - {b.endTime}
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold">
                            ₹{b.pricingDetails?.totalAmount || b.totalPrice || 0}
                          </div>
                          <div
                            style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}
                            className="fw-medium small"
                          >
                            {b.paymentStatus === 'success' ||
                            b.paymentStatus === 'completed' ||
                            b.paymentStatus === 'paid' ||
                            b.status === 'confirmed'
                              ? 'Paid'
                              : b.status === 'cancelled'
                                ? 'Refunded'
                                : b.paymentStatus || 'Pending'}
                          </div>
                        </td>
                        <td>{getStatusBadge(b.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalRecords > 0 && (
              <div className="card-footer bg-body border-top d-flex justify-content-between align-items-center p-3">
                <div className="text-muted small">
                  {(pagination.currentPage - 1) * 10 + 1}-
                  {Math.min(pagination.currentPage * 10, pagination.totalRecords)} of{' '}
                  {pagination.totalRecords}
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    disabled={pagination.currentPage <= 1}
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                  >
                    <i className="fa-solid fa-chevron-left"></i> Prev
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                  >
                    Next <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLedgersView
