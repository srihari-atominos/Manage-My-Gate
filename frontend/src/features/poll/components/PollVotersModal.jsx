import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPeople, cilWarning } from '@coreui/icons'
import { pollApi } from '../services/pollApi'

const PollVotersModal = ({ visible, onClose, poll }) => {
  const [loading, setLoading] = useState(false)
  const [voters, setVoters] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    if (visible && poll) {
      fetchVoters()
    } else {
      setVoters({})
      setError(null)
    }
  }, [visible, poll])

  const fetchVoters = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await pollApi.getPollVoters(poll._id)
      if (response && response.data) {
        setVoters(response.data)
      }
    } catch (err) {
      console.error('Error fetching voters:', err)
      setError(err.response?.data?.message || 'Failed to load voters. You may not have permission.')
    } finally {
      setLoading(false)
    }
  }

  const totalVotes = poll?.options?.reduce((sum, opt) => sum + opt.votesCount, 0) || 0

  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center gap-2" style={{ fontSize: '15px' }}>
          <CIcon icon={cilPeople} size="sm" />
          Poll Results & Voters
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {poll && (
          <div className="mb-3 pb-2 border-bottom">
            <h6 className="mb-1 fw-bold">{poll.question}</h6>
            <span className="text-muted" style={{ fontSize: '12px' }}>
              Total Votes: {totalVotes}
            </span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">
            <CSpinner color="primary" size="sm" />
            <div className="mt-2 text-muted small">Loading voters...</div>
          </div>
        ) : error ? (
          <div className="text-center py-3 text-danger">
            <CIcon icon={cilWarning} size="lg" className="mb-2" />
            <div className="small">{error}</div>
          </div>
        ) : (
          <div className="voters-list d-flex flex-column gap-3">
            {poll?.options?.map((option, index) => {
              const optionVoters = voters[index] || []
              const percentage =
                totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0

              return (
                <div
                  key={index}
                  className="border rounded p-3"
                  style={{ backgroundColor: '#f8f9fa' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold" style={{ fontSize: '13.5px' }}>
                      {option.text}
                    </span>
                    <div className="d-flex align-items-center gap-1">
                      <CBadge color="primary" shape="rounded-pill" style={{ fontSize: '10px' }}>
                        {option.votesCount} votes
                      </CBadge>
                      <CBadge color="secondary" shape="rounded-pill" style={{ fontSize: '10px' }}>
                        {percentage}%
                      </CBadge>
                    </div>
                  </div>

                  {optionVoters.length > 0 ? (
                    <div className="table-responsive bg-white rounded border">
                      <table
                        className="table table-sm table-hover mb-0"
                        style={{ fontSize: '12.5px' }}
                      >
                        <thead className="table-light">
                          <tr>
                            <th
                              className="w-50 ps-3 border-0"
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: '#768192',
                              }}
                            >
                              Resident Name
                            </th>
                            <th
                              className="w-50 ps-3 border-0"
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: '#768192',
                              }}
                            >
                              Unit / Villa
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {optionVoters.map((voter, vIdx) => (
                            <tr key={vIdx}>
                              <td className="w-50 ps-3 align-middle">{voter.name}</td>
                              <td className="w-50 ps-3 align-middle">
                                {voter.unit ? (
                                  <CBadge
                                    color="info"
                                    variant="outline"
                                    style={{ fontSize: '10px' }}
                                  >
                                    {voter.unit}
                                  </CBadge>
                                ) : (
                                  <span className="text-muted small">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      className="text-muted p-2 text-center bg-white rounded border"
                      style={{ fontSize: '12px' }}
                    >
                      No votes for this option yet.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default PollVotersModal
