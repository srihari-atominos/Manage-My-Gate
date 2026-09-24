import React, { memo } from 'react'

const MonthRenderer = memo(
  ({ currentDate, events = [], onDateSelect, selectedDate, onEventClick }) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const startDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun

    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()

    // Generate 35 or 42 grid cells
    const gridCells = []

    // 1. Trailing days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const prevDate = new Date(year, month - 1, d)
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      gridCells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
      })
    }

    // 2. Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(year, month, d)
      const dateStr = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      gridCells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
      })
    }

    // 3. Leading days of next month to complete the week
    let nextDay = 1
    while (gridCells.length % 7 !== 0) {
      const nextDate = new Date(year, month + 1, nextDay)
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
      gridCells.push({
        dayNumber: nextDay,
        dateStr,
        isCurrentMonth: false,
      })
      nextDay++
    }

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

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
          {gridCells.map((cell, index) => {
            const isToday = cell.dateStr === todayStr
            const isSelected = cell.dateStr === selectedDate
            const cellEvents = events.filter((e) => e.date === cell.dateStr)
            const visibleChips = cellEvents.slice(0, 3)
            const remainingCount = cellEvents.length - visibleChips.length

            return (
              <div
                key={index}
                className={[
                  'rcv-day-cell',
                  'rcv-day-cell--active',
                  !cell.isCurrentMonth ? 'rcv-day-cell--outside-month' : '',
                  isToday ? 'rcv-day-cell--today' : '',
                  isSelected ? 'rcv-day-cell--selected' : '',
                  cellEvents.length > 0 ? 'rcv-day-cell--has-bookings' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onDateSelect && onDateSelect(cell.dateStr)}
                style={{
                  opacity: cell.isCurrentMonth ? 1 : 0.45,
                  minHeight: '105px',
                  cursor: 'pointer',
                }}
              >
                <div className="d-flex justify-content-between align-items-center w-100 mb-1">
                  <span
                    className={`rcv-day-number ${isToday ? 'rcv-day-number--today' : ''} ${isSelected ? 'rcv-day-number--selected' : ''}`}
                  >
                    {cell.dayNumber}
                  </span>
                  {cellEvents.length > 0 && (
                    <span
                      className="badge rounded-pill bg-light text-dark border small"
                      style={{ fontSize: '9px' }}
                    >
                      {cellEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Chips List */}
                <div className="w-100 d-flex flex-column gap-1 overflow-hidden">
                  {visibleChips.map((e) => {
                    const isMaint = e.type === 'maintenance'
                    const statusKey = isMaint
                      ? 'maintenance'
                      : String(e.status || 'confirmed')
                          .toLowerCase()
                          .replace('-', '_')

                    return (
                      <div
                        key={e.id}
                        className={`rcv-event-chip rcv-event-chip--${statusKey}`}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          if (onEventClick) onEventClick(e)
                        }}
                        title={`${e.start || ''} ${e.title} (${e.subtitle || ''})`}
                      >
                        {isMaint ? (
                          <i
                            className="fa-solid fa-wrench me-1 text-warning"
                            style={{ fontSize: '9px' }}
                          ></i>
                        ) : (
                          <span className="rcv-event-chip-time">{e.start}</span>
                        )}
                        <span className="rcv-event-chip-title">{e.amenityName || e.title}</span>
                        {!isMaint && e.paymentStatus === 'PAID' && (
                          <span className="text-success ms-1 fw-bold" style={{ fontSize: '9px' }}>
                            ✓
                          </span>
                        )}
                        {!isMaint && e.paymentStatus === 'PARTIALLY_PAID' && (
                          <span className="text-warning ms-1 fw-bold" style={{ fontSize: '9px' }}>
                            ◐
                          </span>
                        )}
                        {!isMaint && e.paymentStatus === 'PENDING' && (
                          <span className="text-danger ms-1 fw-bold" style={{ fontSize: '9px' }}>
                            !
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {remainingCount > 0 && (
                    <div
                      className="text-muted small px-1"
                      style={{ fontSize: '10px', fontWeight: 600 }}
                    >
                      +{remainingCount} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <style>{`
        .rcv-event-chip {
          width: 100%;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          line-height: 1.2;
        }
        .rcv-event-chip:hover {
          transform: scale(1.02);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
          z-index: 5;
        }
        .rcv-event-chip--confirmed {
          background: #ECFCCB;
          border-color: #84CC16;
          color: #3F6212;
        }
        .rcv-event-chip--checked_in, .rcv-event-chip--entered {
          background: #DBEAFE;
          border-color: #3B82F6;
          color: #1E3A8A;
        }
        .rcv-event-chip--completed {
          background: #F3F4F6;
          border-color: #9CA3AF;
          color: #374151;
        }
        .rcv-event-chip--cancelled {
          background: #FEE2E2;
          border-color: #EF4444;
          color: #991B1B;
        }
        .rcv-event-chip--maintenance {
          background: #FEF3C7;
          border-color: #F59E0B;
          color: #92400E;
        }
        .rcv-event-chip-time {
          font-weight: 700;
          margin-right: 4px;
          font-size: 10px;
          flex-shrink: 0;
        }
        .rcv-event-chip-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
      `}</style>
      </div>
    )
  },
)

export default MonthRenderer
