import React from 'react'
import { CPlaceholder } from '@coreui/react'
import AmenityStatusBadge from '../AmenityStatusBadge.jsx'
import { formatCurrency } from '../../utils/amenityUtils.js'

const PAYMENT_BADGE = {
  paid: { bg: '#D1FAE5', color: '#059669', label: 'Paid' },
  pending: { bg: '#FEF3C7', color: '#B45309', label: 'Pending' },
  failed: { bg: '#FEE2E2', color: '#DC2626', label: 'Failed' },
}

const BookingSkeleton = () => (
  <div
    style={{
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid #E2E8F0',
      background: '#fff',
      display: 'flex',
      flexDirection: 'row',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}
  >
    <CPlaceholder animation="glow" style={{ width: '180px', minHeight: '150px', flexShrink: 0 }} />
    <div
      style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
      <CPlaceholder animation="glow" xs={7} size="lg" />
      <CPlaceholder animation="glow" xs={4} />
      <CPlaceholder animation="glow" xs={9} />
    </div>
  </div>
)

const ResidentBookingList = ({ events, onEventClick, onBookClick, loading }) => {
  if (loading) {
    return (
      <div className="rbl-wrapper">
        <div className="rbl-heading">All Bookings</div>
        <div className="rbl-grid">
          {[1, 2, 3].map((i) => (
            <BookingSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return null
  }

  return (
    <div className="rbl-wrapper">
      <div className="rbl-heading-row">
        <div className="rbl-heading">All Bookings</div>
        <span className="rbl-count">
          {events.length} booking{events.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="rbl-grid">
        {events.map((event) => {
          const payment = PAYMENT_BADGE[event.paymentStatus] || PAYMENT_BADGE.pending
          const dateLabel = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          return (
            <div key={event.id} className="rbl-card" onClick={() => onEventClick(event)}>
              {/* Image */}
              <div className="rbl-card__image" style={{ backgroundImage: `url(${event.image})` }} />

              {/* Body */}
              <div className="rbl-card__body">
                <div className="rbl-card__header">
                  <h5 className="rbl-card__amenity">{event.amenityName}</h5>
                  <div className="rbl-card__badges">
                    <AmenityStatusBadge status={event.status} />
                    <span
                      className="rbl-payment-badge"
                      style={{ background: payment.bg, color: payment.color }}
                    >
                      {payment.label}
                    </span>
                  </div>
                </div>

                <div className="rbl-card__id">Booking #{event.bookingId?.toString().slice(-8)}</div>

                <div className="rbl-card__meta">
                  <div className="rbl-meta-item">
                    <i className="fa-regular fa-calendar"></i>
                    <span>{dateLabel}</span>
                  </div>
                  <div className="rbl-meta-item">
                    <i className="fa-regular fa-clock"></i>
                    <span>
                      {event.start} – {event.end}
                    </span>
                  </div>
                  <div className="rbl-meta-item">
                    <i className="fa-regular fa-hourglass-half"></i>
                    <span>
                      {event.duration} hr{event.duration !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="rbl-meta-item rbl-meta-item--price">
                    <i className="fa-solid fa-tag"></i>
                    <span>{formatCurrency(event.price)}</span>
                  </div>
                </div>

                <div className="rbl-card__footer">
                  <div className="rbl-qr-status">
                    {event.qrCode ? (
                      <span className="rbl-qr-status--ready">
                        <i className="fa-solid fa-qrcode"></i> QR Ready
                      </span>
                    ) : (
                      <span className="rbl-qr-status--pending">
                        <i className="fa-regular fa-clock"></i> QR Pending
                      </span>
                    )}
                  </div>
                  <span className="rbl-view-link">
                    View Details <i className="fa-solid fa-arrow-right"></i>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        .rbl-wrapper {
          margin-top: 48px;
        }
        .rbl-heading {
          font-size: 24px;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.02em;
        }
        .rbl-heading-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .rbl-count {
          font-size: 13px;
          font-weight: 700;
          background: #EFF6FF;
          color: #0084FF;
          padding: 4px 12px;
          border-radius: 24px;
          border: 1px solid #BFDBFE;
        }
        .rbl-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .rbl-empty-state {
          margin-top: 20px;
          background: #ffffff;
          border-radius: 24px;
          border: 2px dashed #E2E8F0;
          padding: 80px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .rbl-empty-icon {
          width: 88px;
          height: 88px;
          background: #F8FAFC;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          color: #94A3B8;
          margin-bottom: 24px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
          border: 1px solid #F1F5F9;
        }
        .rbl-empty-title {
          font-size: 22px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 10px;
        }
        .rbl-empty-sub {
          font-size: 15px;
          color: #64748B;
          margin-bottom: 32px;
        }
        .rbl-book-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0084FF;
          color: #ffffff;
          border: none;
          border-radius: 50px;
          padding: 14px 32px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0,132,255,0.25);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .rbl-book-btn:hover {
          background: #006BCC;
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0,132,255,0.35);
        }

        /* Booking card */
        .rbl-card {
          display: flex;
          flex-direction: row;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #F1F5F9;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }
        .rbl-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
          border-color: #E2E8F0;
        }
        .rbl-card__image {
          width: 220px;
          min-height: 100%;
          background-size: cover;
          background-position: center;
          background-color: #F8FAFC;
          flex-shrink: 0;
          position: relative;
        }
        .rbl-card__image::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, rgba(0,0,0,0.1), transparent);
        }
        .rbl-card__body {
          flex: 1;
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .rbl-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .rbl-card__amenity {
          font-size: 20px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .rbl-card__badges {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .rbl-payment-badge {
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 24px;
          letter-spacing: 0.02em;
        }
        .rbl-card__id {
          font-size: 13px;
          color: #64748B;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rbl-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 8px;
          padding: 16px;
          background: #F8FAFC;
          border-radius: 16px;
          border: 1px solid #F1F5F9;
        }
        .rbl-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #475569;
          font-weight: 600;
        }
        .rbl-meta-item i {
          color: #94A3B8;
          font-size: 14px;
        }
        .rbl-meta-item--price {
          font-weight: 800;
          color: #0F172A;
          margin-left: auto;
        }
        .rbl-meta-item--price i {
          color: #0084FF;
        }
        .rbl-card__footer {
          margin-top: auto;
          padding-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rbl-qr-status {
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
        }
        .rbl-qr-status--ready  { color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; }
        .rbl-qr-status--pending { color: #64748B; background: #F8FAFC; border: 1px solid #E2E8F0; }
        .rbl-view-link {
          font-size: 14px;
          font-weight: 700;
          color: #0084FF;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: gap 0.2s ease;
        }
        .rbl-card:hover .rbl-view-link {
          gap: 12px;
        }

        @media (max-width: 768px) {
          .rbl-card {
            flex-direction: column;
          }
          .rbl-card__image {
            width: 100%;
            min-height: 200px;
          }
          .rbl-card__header {
            flex-direction: column;
            gap: 12px;
          }
          .rbl-card__badges {
            justify-content: flex-start;
          }
          .rbl-meta-item--price {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default ResidentBookingList
