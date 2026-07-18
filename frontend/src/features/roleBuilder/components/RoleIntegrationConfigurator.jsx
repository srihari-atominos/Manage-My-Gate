import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormCheck,
  CButton,
  CSpinner,
} from '@coreui/react'
import useRoleIntegrationConfigurator from '../hooks/useRoleIntegrationConfigurator.js'

// Providers metadata matching the backend catalog list
const PROVIDERS = [
  { id: 'smtp', name: 'SMTP Email', icon: '✉️' },
  { id: 'twilio', name: 'Twilio SMS', icon: '📱' },
  { id: 'openai', name: 'OpenAI (AI)', icon: '🤖' },
  { id: 'resend', name: 'Resend Email', icon: '✉️' },
]

/**
 * RoleIntegrationConfigurator Component
 *
 * Visual tool to map integration configurations (API accounts) to a system role.
 * Features a horizontal scrollable carousel on top for selecting the provider,
 * and a radio selection table on the bottom for picking the connection.
 */
export const RoleIntegrationConfigurator = ({ isOpen, onClose, mappings, onApply }) => {
  const carouselRef = useRef(null)

  const {
    isLoading,
    filteredConnections,
    selectedProvider,
    setSelectedProvider,
    tempMappings,
    handleSelectConnection,
    handleApply,
  } = useRoleIntegrationConfigurator(isOpen, mappings, onApply, onClose)

  if (!isOpen) return null

  // Carousel scrolling helpers
  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  return (
    <div className="role-integration-configurator mt-3 p-3 border rounded bg-body-secondary-subtle">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0 fw-bold text-primary configurator-title">
          Configure Role Integrations
        </h6>
        <span className="text-secondary small">Select at most 1 connection per provider</span>
      </div>

      {/* Provider Carousel */}
      <div className="carousel-wrapper position-relative mb-3 px-4">
        <button
          type="button"
          className="carousel-nav-btn carousel-nav-left border-0 rounded-circle bg-body shadow-sm"
          onClick={scrollLeft}
        >
          ‹
        </button>

        <div
          ref={carouselRef}
          className="carousel-container d-flex gap-2 overflow-x-auto py-1 scrollbar-hidden"
        >
          {PROVIDERS.map((provider) => {
            const isSelected = selectedProvider === provider.id
            const isMapped = !!tempMappings[provider.id]

            return (
              <button
                key={provider.id}
                type="button"
                className={`carousel-card px-3 py-2 border rounded text-center bg-body flex-shrink-0 d-flex flex-column align-items-center gap-1 ${
                  isSelected ? 'active-card shadow-sm bg-body-secondary' : 'border-light-subtle'
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <span className="provider-icon">{provider.icon}</span>
                <span className="fw-semibold small text-body">{provider.name}</span>
                {isMapped && (
                  <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-0.5 status-badge">
                    Active
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="carousel-nav-btn carousel-nav-right border-0 rounded-circle bg-body shadow-sm"
          onClick={scrollRight}
        >
          ›
        </button>
      </div>

      {/* Connections Table */}
      <div className="connections-table-wrapper border rounded bg-body overflow-hidden mb-3">
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center py-4">
            <CSpinner color="primary" size="sm" className="me-2" />
            <span className="text-body-secondary small">Loading connections...</span>
          </div>
        ) : (
          <CTable align="middle" responsive hover className="mb-0 small">
            <CTableHead className="bg-body-secondary">
              <CTableRow>
                <CTableHeaderCell className="text-center select-col"></CTableHeaderCell>
                <CTableHeaderCell>Connection Name / Label</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {/* None / Disconnect Option */}
              <CTableRow
                onClick={() => handleSelectConnection(null)}
                className="pointer-row"
              >
                <CTableDataCell className="text-center">
                  <CFormCheck
                    type="radio"
                    id="conn-radio-none"
                    name={`conn-radio-${selectedProvider}`}
                    checked={!tempMappings[selectedProvider]}
                    onChange={() => handleSelectConnection(null)}
                  />
                </CTableDataCell>
                <CTableDataCell className="text-muted fw-semibold italic">
                  (None / Disconnect)
                </CTableDataCell>
                <CTableDataCell>
                  <span className="text-secondary">—</span>
                </CTableDataCell>
              </CTableRow>

              {/* Connections List */}
              {filteredConnections.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={3} className="text-center py-3 text-body-secondary">
                    No connections connected yet. Set up connections in the Integration Hub.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                filteredConnections.map((conn) => {
                  const isChecked = tempMappings[selectedProvider] === conn.id
                  return (
                    <CTableRow
                      key={conn.id}
                      onClick={() => handleSelectConnection(conn.id)}
                      className="pointer-row"
                    >
                      <CTableDataCell className="text-center">
                        <CFormCheck
                          type="radio"
                          id={`conn-radio-${conn.id}`}
                          name={`conn-radio-${selectedProvider}`}
                          checked={isChecked}
                          onChange={() => handleSelectConnection(conn.id)}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="fw-semibold text-body">
                        {conn.accountLabel}
                      </CTableDataCell>
                      <CTableDataCell>
                        <span className="badge rounded-pill bg-success px-2 py-1 text-white">
                          Connected
                        </span>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })
              )}
            </CTableBody>
          </CTable>
        )}
      </div>

      {/* Action Footer */}
      <div className="d-flex justify-content-end gap-2 pt-2 border-top">
        <CButton size="sm" color="light" onClick={onClose}>
          Cancel
        </CButton>
        <CButton size="sm" color="primary" onClick={handleApply}>
          Apply Mappings
        </CButton>
      </div>
    </div>
  )
}

RoleIntegrationConfigurator.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mappings: PropTypes.object,
  onApply: PropTypes.func.isRequired,
}

export default RoleIntegrationConfigurator
