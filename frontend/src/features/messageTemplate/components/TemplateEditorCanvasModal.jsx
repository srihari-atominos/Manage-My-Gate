import React from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CButton,
  CAlert,
  CSpinner,
  CRow,
  CCol,
} from '@coreui/react'
import useTemplateEditorCanvas from '../hooks/useTemplateEditorCanvas'
import '../styles/_messageTemplate.scss'

/**
 * TemplateEditorCanvasModal Component
 *
 * Canvas editor modal to customize notification templates.
 * Enforces `{{invite_link}}` for invitations.
 * Scopes channel types dynamically based on active Integration Hub connections.
 */
export const TemplateEditorCanvasModal = ({ visible, onClose }) => {
  const {
    isLoading,
    apiError,
    isHubLoading,
    availableTypes,
    name,
    setName,
    type,
    setType,
    subject,
    setSubject,
    cc,
    setCc,
    bcc,
    setBcc,
    body,
    setBody,
    validationError,
    isSubmitting,
    handleSave,
  } = useTemplateEditorCanvas(visible, onClose)

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      backdrop="static"
      id="template-editor-modal"
    >
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem', fontWeight: 700 }}>
          ✉️ Configure Invitation Template
        </CModalTitle>
      </CModalHeader>

      <form onSubmit={handleSave}>
        <CModalBody>
          {(validationError || apiError) && (
            <CAlert color="danger" className="py-2 small">
              {validationError || apiError}
            </CAlert>
          )}

          {isHubLoading ? (
            <div className="d-flex justify-content-center align-items-center py-4">
              <CSpinner color="primary" size="sm" className="me-2" />
              <span className="text-body-secondary small">Detecting active integrations...</span>
            </div>
          ) : availableTypes.length === 0 ? (
            <CAlert color="warning" className="my-2 small">
              ⚠️ <strong>No Active Integrations:</strong> You have not configured any active SMTP,
              Resend, or Twilio connections in the <strong>Integration Hub</strong>. Please connect
              a provider first before writing custom templates.
            </CAlert>
          ) : (
            <>
              {/* Template Name & Channel Selection Row */}
              <CRow className="g-3 mb-3">
                <CCol md={6}>
                  <CFormLabel htmlFor="tmpl-name-input" className="small fw-bold">
                    Template Label
                  </CFormLabel>
                  <CFormInput
                    id="tmpl-name-input"
                    type="text"
                    placeholder="e.g. Standard Org Welcome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </CCol>

                <CCol md={6}>
                  <CFormLabel htmlFor="tmpl-type-select" className="small fw-bold">
                    Channel Type (Integration-Derived)
                  </CFormLabel>
                  <CFormSelect
                    id="tmpl-type-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {availableTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              {/* Subject (Only for Email channel) */}
              {type === 'email' && (
                <>
                  <div className="mb-3">
                    <CFormLabel htmlFor="tmpl-subject-input" className="small fw-bold">
                      Email Subject Line
                    </CFormLabel>
                    <CFormInput
                      id="tmpl-subject-input"
                      type="text"
                      placeholder="Subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required={type === 'email'}
                    />
                  </div>

                  <CRow className="g-3 mb-3">
                    <CCol md={6}>
                      <CFormLabel htmlFor="tmpl-cc-input" className="small fw-bold">
                        CC Email Addresses (Optional)
                      </CFormLabel>
                      <CFormInput
                        id="tmpl-cc-input"
                        type="text"
                        placeholder="e.g. manager@org.com, audit@org.com"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel htmlFor="tmpl-bcc-input" className="small fw-bold">
                        BCC Email Addresses (Optional)
                      </CFormLabel>
                      <CFormInput
                        id="tmpl-bcc-input"
                        type="text"
                        placeholder="e.g. archive@org.com"
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                      />
                    </CCol>
                  </CRow>
                </>
              )}

              {/* Body Canvas Editor */}
              <div className="mb-3">
                <CFormLabel htmlFor="tmpl-body-textarea" className="small fw-bold">
                  Template Body Canvas
                </CFormLabel>
                <CFormTextarea
                  id="tmpl-body-textarea"
                  rows={8}
                  className="font-monospace"
                  style={{ fontSize: '0.85rem' }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />

                {/* Placeholder variable indicator */}
                <div className="mt-2 p-2 border rounded bg-body-secondary d-flex align-items-center justify-content-between">
                  <span className="small text-secondary">
                    Required placeholder:{' '}
                    <code className="fw-bold text-primary">{'{{invite_link}}'}</code>
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-primary fw-bold"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => {
                      if (!body.includes('{{invite_link}}')) {
                        setBody((prev) => prev + '\n{{invite_link}}')
                      }
                    }}
                  >
                    + Insert invite link
                  </button>
                </div>
              </div>
            </>
          )}
        </CModalBody>

        <CModalFooter className="border-0 pt-0">
          <CButton color="light" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </CButton>
          <CButton
            type="submit"
            color="primary"
            size="sm"
            style={{ fontWeight: 600 }}
            disabled={isSubmitting || availableTypes.length === 0}
          >
            {isSubmitting ? 'Saving Template...' : 'Save Template'}
          </CButton>
        </CModalFooter>
      </form>
    </CModal>
  )
}

TemplateEditorCanvasModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default TemplateEditorCanvasModal
