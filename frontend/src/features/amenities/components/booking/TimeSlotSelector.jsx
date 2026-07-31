import React, { memo } from 'react'
import { CCard, CCardBody, CButton, CSpinner } from '@coreui/react'

const calculateDuration = (start, end) => {
  if (!start || !end) return ''
  const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(' ')
    let [hours, minutes] = time.split(':').map(Number)
    if (modifier === 'PM' && hours < 12) hours += 12
    if (modifier === 'AM' && hours === 12) hours = 0
    return hours * 60 + minutes
  }

  try {
    const startMins = parseTime(start)
    const endMins = parseTime(end)
    let diff = endMins - startMins
    if (diff < 0) diff += 24 * 60 // handle cross-midnight if applicable
    return `${diff} Minutes`
  } catch (e) {
    return ''
  }
}

const TimeSlotSelector = memo(
  ({ draft, availableSlots = [], slotsLoading, updateDraft, onBack, errorMsg }) => {
    return (
      <CCard className="border-0 shadow-sm mb-4">
        <CCardBody className="p-4">
          <h5 className="mb-3">Select Time Slot</h5>
          {errorMsg && <div className="alert alert-danger mb-4">{errorMsg}</div>}

          {slotsLoading ? (
            <div className="d-flex justify-content-center p-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <div className="d-flex flex-wrap gap-3 mb-4">
              {availableSlots.length === 0 ? (
                <div className="w-100 text-center p-4 text-muted border rounded bg-body-secondary">
                  <i className="fa-regular fa-calendar-xmark fs-2 mb-3 text-secondary"></i>
                  <h6 className="fw-bold">No available slots for this date.</h6>
                  <p className="mb-0 small">Please select another date or amenity.</p>
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-3">
                  {availableSlots.map((slot, idx) => {
                    const maxLimit =
                      slot.maxBookingsPerUser || draft.amenity?.maxBookingsPerUserPerSlot || 2
                    const myCount = slot.myBookingsCount || 0
                    const canBookMore = myCount < maxLimit && slot.status === 'Available'

                    const isSelected = draft.startTime === slot.startTime
                    const isAvailable = slot.status === 'Available' && canBookMore
                    const isBookedByMeFull = slot.bookedByMe && !canBookMore
                    const isBooked = slot.status === 'Booked'
                    const isClosed = slot.status === 'Closed'
                    const isMaintenance = slot.status === 'Maintenance'

                    let borderColor = 'border'
                    let pillBg = ''
                    let pillText = ''
                    let dotColor = ''
                    let statusLabel = ''
                    let opacity = 1
                    let cursor = 'pointer'
                    let isDisabled = false

                    if (isSelected) {
                      borderColor = 'border-primary border-2 shadow-sm'
                    } else if (isBookedByMeFull) {
                      borderColor = 'border'
                      pillBg = 'bg-success bg-opacity-10'
                      pillText = 'text-success'
                      dotColor = 'bg-success'
                      statusLabel = `Booked by You (${myCount}/${maxLimit})`
                      cursor = 'not-allowed'
                      isDisabled = true
                    } else if (isBooked) {
                      borderColor = 'border'
                      pillBg = 'bg-danger bg-opacity-10'
                      pillText = 'text-danger'
                      dotColor = 'bg-danger'
                      statusLabel = 'Booked'
                      cursor = 'not-allowed'
                      opacity = 0.7
                      isDisabled = true
                    } else if (isMaintenance) {
                      borderColor = 'border'
                      pillBg = 'bg-warning bg-opacity-10'
                      pillText = 'text-warning'
                      dotColor = 'bg-warning'
                      statusLabel = 'Maintenance'
                      cursor = 'not-allowed'
                      opacity = 0.7
                      isDisabled = true
                    } else if (isClosed) {
                      borderColor = 'border'
                      pillBg = 'bg-secondary bg-opacity-10'
                      pillText = 'text-secondary'
                      dotColor = 'bg-secondary'
                      statusLabel = 'Closed'
                      cursor = 'not-allowed'
                      opacity = 0.6
                      isDisabled = true
                    } else {
                      // Available
                      borderColor = 'border'
                      pillBg = 'bg-success bg-opacity-10'
                      pillText = 'text-success'
                      dotColor = 'bg-success'
                      statusLabel =
                        myCount > 0 ? `Booked by You (${myCount}/${maxLimit})` : 'Available'
                    }

                    return (
                      <div
                        key={idx}
                        className={`position-relative p-3 rounded-4 bg-body ${borderColor}`}
                        style={{ cursor, minWidth: '150px', transition: 'all 0.2s', opacity }}
                        onClick={() =>
                          !isDisabled &&
                          updateDraft({
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            price: slot.price,
                            myBookingsCount: slot.myBookingsCount || 0,
                          })
                        }
                      >
                        {isSelected && (
                          <div
                            className="position-absolute bg-primary rounded-circle"
                            style={{
                              width: '20px',
                              height: '20px',
                              top: '-8px',
                              right: '-8px',
                              border: '3px solid white',
                            }}
                          ></div>
                        )}

                        <div className="fw-bolder fs-3 text-body mb-1">{slot.startTime}</div>
                        <div className="d-flex align-items-center mb-3">
                          <span className="text-secondary fw-semibold me-2">{slot.endTime}</span>
                          <span className="text-black-50 small">{slot.duration || '60'}m</span>
                        </div>

                        <div className="d-flex justify-content-between align-items-center">
                          {isSelected ? (
                            <div className="bg-primary text-white text-center rounded-pill py-1 px-3 fw-bold small w-100">
                              Selected
                            </div>
                          ) : (
                            <div
                              className={`d-inline-flex align-items-center rounded-pill py-1 px-3 ${pillBg} ${pillText} fw-bold small`}
                            >
                              <span
                                className={`rounded-circle me-2 ${dotColor}`}
                                style={{ width: '8px', height: '8px' }}
                              ></span>
                              {statusLabel}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="d-flex justify-content-start pt-3 border-top mt-4">
            <CButton
              color="secondary"
              variant="ghost"
              onClick={onBack}
              className="px-4 rounded-pill"
            >
              <i className="fa-solid fa-arrow-left me-2"></i> Back
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    )
  },
)

export default TimeSlotSelector
