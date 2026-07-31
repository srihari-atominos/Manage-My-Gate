import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'

const CalendarEventDetailModal = ({ visible, onClose, eventDetails }) => {
  if (!eventDetails) return null

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="lg"
      backdrop="static"
      className="amenity-os-theme"
    >
      <CModalHeader>
        <CModalTitle>
          {eventDetails.amenityName} ({eventDetails.startTime} - {eventDetails.endTime})
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-3">
          <strong>Total Attendees:</strong> {eventDetails.totalAttendees}
        </div>
        <CTable hover striped bordered>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Resident Name</CTableHeaderCell>
              <CTableHeaderCell>Total Persons</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {eventDetails.attendeeDetails?.map((attendee, index) => (
              <CTableRow key={`${attendee.userId}-${index}`}>
                <CTableDataCell>{attendee.userName || 'Unknown Resident'}</CTableDataCell>
                <CTableDataCell>{attendee.numberOfPersons}</CTableDataCell>
              </CTableRow>
            ))}
            {(!eventDetails.attendeeDetails || eventDetails.attendeeDetails.length === 0) && (
              <CTableRow>
                <CTableDataCell colSpan="2" className="text-center text-muted">
                  No attendees found.
                </CTableDataCell>
              </CTableRow>
            )}
          </CTableBody>
        </CTable>
      </CModalBody>
    </CModal>
  )
}

export default CalendarEventDetailModal
