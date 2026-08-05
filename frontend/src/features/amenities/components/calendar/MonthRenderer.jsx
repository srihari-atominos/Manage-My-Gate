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


    </div>
  )
})

export default MonthRenderer
