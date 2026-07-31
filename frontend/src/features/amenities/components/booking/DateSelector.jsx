import React, { memo } from 'react'
import { CCard, CCardBody, CFormInput, CButton } from '@coreui/react'

const DateSelector = memo(({ draft, updateDraft, onNext, errorMsg }) => {
  const getTodayDateString = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <CCard className="border-0 shadow-sm mb-4">
      <CCardBody className="p-4">
        <h5 className="mb-3">Select a Date</h5>
        <div className="mb-4">
          <CFormInput
            type="date"
            size="lg"
            min={getTodayDateString()}
            value={draft.bookingDate}
            onChange={(e) => updateDraft({ bookingDate: e.target.value })}
            invalid={!!errorMsg && !draft.bookingDate}
          />
          {errorMsg && !draft.bookingDate && (
            <div className="invalid-feedback d-block">{errorMsg}</div>
          )}
        </div>

        <div className="d-flex justify-content-end">
          <CButton
            color="primary"
            onClick={onNext}
            className="px-5 rounded-pill shadow-sm"
            disabled={!draft.bookingDate}
          >
            Next Step <i className="fa-solid fa-arrow-right ms-2"></i>
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
})

export default DateSelector
