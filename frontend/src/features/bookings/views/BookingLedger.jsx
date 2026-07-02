import React from 'react';
import '../../amenities/styles/_amenities.scss';
import { useBookings } from '../hooks/useBookings.js';

export const BookingLedger = () => {
  const { bookings, loading, updateStatus } = useBookings();

  if (loading) return <div className="amenity-feature-container">Loading...</div>;

  return (
    <div className="amenity-feature-container">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '32px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '24px', margin: 0, marginBottom: '8px' }}>Booking Master Ledger</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, margin: 0 }}>Overview of all facility bookings in the community.</p>
          </div>
        </div>

        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="ent-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Resident</th>
                <th>Amenity & Slot</th>
                <th>Financials</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking._id} data-status={booking.bookingStatus}>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>#{booking._id.substring(booking._id.length - 6).toUpperCase()}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{booking.userId?.name || 'Unknown User'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{booking.amenityId?.name || 'Deleted Amenity'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{new Date(booking.date).toLocaleDateString()} • {booking.startTime} - {booking.endTime}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>₹{booking.totalAmount}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{booking.paymentStatus}</div>
                  </td>
                  <td>
                    <span className={`badge ${booking.bookingStatus === 'Confirmed' ? 'badge-success' : booking.bookingStatus === 'Cancelled' ? 'badge-warning' : 'badge-info'}`}>
                      {booking.bookingStatus}
                    </span>
                  </td>
                  <td>
                    {booking.bookingStatus === 'Confirmed' && (
                      <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => updateStatus(booking._id, 'Cancelled')}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BookingLedger;
