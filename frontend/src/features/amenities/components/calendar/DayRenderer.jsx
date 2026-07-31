import React, { memo } from 'react'

const DayRenderer = memo(({ currentDate, events = [], onEventClick }) => {
  const d = new Date(currentDate)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const hourHeight = 60 // 60px per hour

  const getEventsForDay = (dateObj) => {
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
    return events.filter((e) => e.date === dateStr)
  }

  const parseTime = (timeStr) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h + m / 60
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
        return { bg: '#ECFCCB', border: '#84CC16', text: '#3F6212' }
      case 'pending':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }
      case 'checked-in':
      case 'entered':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E3A8A' }
      case 'completed':
        return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' }
      case 'cancelled':
      case 'rejected':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }
      case 'in_progress':
      case 'maintenance':
        return { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' }
      case 'open':
        return { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569' }
      default:
        return { bg: '#F1F5F9', border: '#CBD5E1', text: '#334155' }
    }
  }

  const dayEvents = getEventsForDay(d)
  const isToday = d.toDateString() === new Date().toDateString()

  return (
    <div className="rcv-day-grid-container">
      {/* Header */}
      <div className="rcv-day-header">
        <div className="rcv-time-col-header"></div>
        <div className={`rcv-day-col-header ${isToday ? 'is-today' : ''}`}>
          <div className="rcv-day-name">{d.toLocaleDateString('en-US', { weekday: 'long' })}</div>
          <div className="rcv-day-date">{d.getDate()}</div>
        </div>
      </div>

      {/* Body */}
      <div className="rcv-day-body">
        <div className="rcv-time-col">
          {hours.map((h) => (
            <div key={h} className="rcv-time-slot">
              {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
            </div>
          ))}
        </div>

        <div className="rcv-days-wrapper">
          <div className="rcv-day-col">
            {hours.map((h) => (
              <div key={h} className="rcv-grid-cell"></div>
            ))}

            {/* Render Events Absolute */}
            {dayEvents.map((evt) => {
              const startH = parseTime(evt.start)
              const endH = parseTime(evt.end)
              const dur = Math.max(endH - startH, 0.5) // min 30 min height
              const top = startH * hourHeight
              const height = dur * hourHeight
              const colors = getStatusColor(evt.colorKey || evt.status)

              return (
                <div
                  key={evt.id}
                  className="rcv-event-card"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                    width: '98%',
                    left: '1%',
                  }}
                  onClick={() => onEventClick && onEventClick(evt)}
                >
                  <div className="rcv-event-header">
                    <span className="rcv-event-title">{evt.title}</span>
                    <span className="rcv-event-time">
                      {evt.start} - {evt.end}
                    </span>
                  </div>
                  {evt.subtitle && <div className="rcv-event-subtitle">{evt.subtitle}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        .rcv-day-grid-container {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E2E8F0;
          overflow-x: auto;
          display: flex;
          flex-direction: column;
          height: 700px;
        }
        .rcv-day-header {
          display: flex;
          border-bottom: 1px solid #E2E8F0;
          background: #F8FAFC;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .rcv-time-col-header {
          width: 80px;
          flex-shrink: 0;
          border-right: 1px solid #E2E8F0;
        }
        .rcv-day-col-header {
          flex: 1;
          padding: 16px;
          text-align: center;
        }
        .rcv-day-col-header.is-today .rcv-day-date {
          background: #0084FF;
          color: #fff;
        }
        .rcv-day-name {
          font-size: 14px;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
        }
        .rcv-day-date {
          font-size: 24px;
          font-weight: 700;
          color: #0F172A;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin: 4px auto 0;
        }
        .rcv-day-body {
          display: flex;
          flex: 1;
          overflow-y: auto;
          position: relative;
        }
        .rcv-time-col {
          width: 80px;
          flex-shrink: 0;
          border-right: 1px solid #E2E8F0;
          background: #fff;
          position: sticky;
          left: 0;
          z-index: 10;
        }
        .rcv-time-slot {
          height: 60px;
          padding: 8px 12px;
          text-align: right;
          font-size: 13px;
          color: #94A3B8;
          font-weight: 500;
          border-bottom: 1px solid transparent;
          box-sizing: border-box;
          transform: translateY(-10px);
        }
        .rcv-days-wrapper {
          display: flex;
          flex: 1;
        }
        .rcv-day-col {
          flex: 1;
          position: relative;
        }
        .rcv-grid-cell {
          height: 60px;
          border-bottom: 1px dashed #E2E8F0;
          box-sizing: border-box;
        }
        .rcv-event-card {
          position: absolute;
          border-left: 4px solid;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: transform 0.1s;
          z-index: 5;
        }
        .rcv-event-card:hover {
          transform: scale(1.01);
          z-index: 10;
        }
        .rcv-event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .rcv-event-title {
          font-weight: 700;
        }
        .rcv-event-time {
          font-size: 12px;
          opacity: 0.8;
          font-weight: 500;
        }
        .rcv-event-subtitle {
          font-size: 12px;
          opacity: 0.9;
        }
      `}</style>
    </div>
  )
})

export default DayRenderer
