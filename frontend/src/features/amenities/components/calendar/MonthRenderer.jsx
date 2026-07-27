import React, { memo } from 'react'

const MonthRenderer = memo(({ currentDate, events = [], onDateSelect, selectedDate }) => {
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = []

  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  while (days.length % 7 !== 0) days.push(null)

  const today = new Date()

  const isToday = (day) =>
    day === today.getDate() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear()

  const isSelected = (day) => {
    if (!day || !selectedDate) return false
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dateStr === selectedDate
  }

  const getDayBookings = (day) => {
    if (!day) return []
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter((e) => e.date === dateStr)
  }

  const handleCellClick = (day) => {
    if (!day) return
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onDateSelect(dateStr)
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="rcv-month-grid">
      {/* Weekday Headers */}
      <div className="rcv-weekday-row">
        {weekDays.map((d) => (
          <div key={d} className="rcv-weekday-cell">
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="rcv-days-grid">
        {days.map((day, index) => {
          const bookings = getDayBookings(day)
          const activeBookings = bookings.filter(
            (b) => !['cancelled', 'rejected'].includes(b.status),
          )
          const todayFlag = day && isToday(day)
          const selectedFlag = day && isSelected(day)
          const hasBookings = activeBookings.length > 0

          return (
            <div
              key={index}
              className={[
                'rcv-day-cell',
                day ? 'rcv-day-cell--active' : 'rcv-day-cell--empty',
                todayFlag ? 'rcv-day-cell--today' : '',
                selectedFlag ? 'rcv-day-cell--selected' : '',
                hasBookings ? 'rcv-day-cell--has-bookings' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleCellClick(day)}
            >
              {day && (
                <>
                  <span
                    className={`rcv-day-number ${todayFlag ? 'rcv-day-number--today' : ''} ${selectedFlag ? 'rcv-day-number--selected' : ''}`}
                  >
                    {day}
                  </span>

                  {hasBookings && (
                    <div className="rcv-booking-dot-row">
                      <span className="rcv-booking-badge">
                        <i className="small fa-solid fa-circle-check"></i>
                        &nbsp;{activeBookings.length}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        .rcv-month-grid {
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #F1F5F9;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
          font-family: 'Inter', system-ui, sans-serif;
        }

        .rcv-weekday-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #F8FAFC;
          border-bottom: 1px solid #F1F5F9;
        }

        .rcv-weekday-cell {
          padding: 18px 8px;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .rcv-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          padding: 12px;
          gap: 8px;
          background: #ffffff;
        }

        .rcv-day-cell {
          min-height: 140px;
          padding: 14px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          cursor: default;
          position: relative;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          background: #F8FAFC;
          border: 1px solid transparent;
        }

        .rcv-day-cell--empty {
          opacity: 0;
          pointer-events: none;
        }

        .rcv-day-cell--active {
          cursor: pointer;
          background: #ffffff;
          border: 1px solid #F1F5F9;
        }

        .rcv-day-cell--active:hover {
          background: #ffffff;
          border-color: #E2E8F0;
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
          z-index: 10;
        }

        .rcv-day-cell--today {
          background: #F0F9FF !important;
          border: 1px solid #BAE6FD !important;
        }

        .rcv-day-cell--selected {
          background: #ffffff !important;
          border: 2px solid #0084FF !important;
          box-shadow: 0 4px 20px rgba(0, 132, 255, 0.15) !important;
        }

        .rcv-day-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          color: #1E293B;
          transition: all 0.2s ease;
        }

        .rcv-day-number--today {
          background: #0084FF;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 132, 255, 0.4);
        }

        .rcv-day-number--selected:not(.rcv-day-number--today) {
          color: #0084FF;
          font-weight: 800;
        }

        .rcv-booking-dot-row {
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          flex: 1;
        }

        .rcv-booking-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #EFF6FF;
          color: #0084FF;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 24px;
          border: 1px solid #BFDBFE;
          box-shadow: 0 2px 4px rgba(0, 132, 255, 0.1);
        }

        @media (max-width: 768px) {
          .rcv-day-cell {
            min-height: 90px;
            padding: 8px;
            gap: 4px;
          }
          .rcv-day-number {
            width: 26px;
            height: 26px;
            font-size: 14px;
          }
          .rcv-booking-badge {
            font-size: 11px;
            padding: 4px 8px;
            gap: 4px;
          }
          .rcv-weekday-cell {
            font-size: 12px;
            padding: 14px 4px;
          }
        }
      `}</style>
    </div>
  )
})

export default MonthRenderer
