import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
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
import { getConnections } from '../../integrationHub/store/integrationHubSlice.js'
import useMessageTemplates from '../hooks/useMessageTemplates'
import '../styles/_messageTemplate.scss'

const DEFAULT_HTML_TEMPLATE = `<div style="font-family: sans-serif; padding: 24px; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
  <h2 style="color: #4f46e5; margin-bottom: 16px;">Workspace Invitation</h2>
  <p>You have been invited to join our secure workspace.</p>
  <p>Please click the button below to set up your password and complete your registration:</p>
  <div style="margin: 32px 0; text-align: center;">
    <a href="{{invite_link}}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
      Accept & Activate Account
    </a>
  </div>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
  <p style="color: #6b7280; font-size: 0.85rem;">
    If you're having trouble clicking the button, copy and paste this link in your browser:<br/>
    <a href="{{invite_link}}" style="color: #4f46e5;">{{invite_link}}</a>
  </p>
</div>`


/**
 * TemplateEditorCanvasModal Component
 *
 * Canvas editor modal to customize notification templates.
 * Enforces `{{invite_link}}` for invitations.
 * Scopes channel types dynamically based on active Integration Hub connections.
 */
export const TemplateEditorCanvasModal = ({ visible, onClose }) => {
  const dispatch = useDispatch()
  const { templates = [], isLoading, error: apiError, loadTemplates, saveTemplate } = useMessageTemplates()

  // Load Integration Hub connections to dynamically derive available template channels
  const { connections = [], isLoading: isHubLoading = false } = useSelector(
    (state) => state.integrationHub || {}
  )

  // Local form states
  const [templateId, setTemplateId] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('email')
  const [purpose, setPurpose] = useState('user_invitation')
  const [subject, setSubject] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [body, setBody] = useState('')
  const [validationError, setValidationError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Fetch templates and integrations on open
  useEffect(() => {
    if (visible) {
      loadTemplates()
      dispatch(getConnections({ limit: 100 }))
      setValidationError(null)
    }
  }, [dispatch, visible, loadTemplates])

  // 2. Compute dynamic available channels based on active integration connections
  const availableTypes = React.useMemo(() => {
    if (!connections || !Array.isArray(connections)) return []
    const activeProviders = connections
      .filter((c) => c && c.provider)
      .map((c) => c.provider.toLowerCase())
    const channels = []
    
    if (activeProviders.includes('smtp') || activeProviders.includes('resend')) {
      channels.push({ value: 'email', label: '📧 Email' })
    }
    if (activeProviders.includes('twilio')) {
      channels.push({ value: 'sms', label: '💬 SMS Text' })
    }
    return channels
  }, [connections])

  // 3. Automatically select the first available channel and populate form if template exists
  useEffect(() => {
    if (visible && templates.length > 0) {
      // Find template matching current selection filter (type + purpose)
      const matchingType = type || (availableTypes[0]?.value || 'email')
      const match = templates.find((t) => t.type === matchingType && t.purpose === purpose)
      
      if (match) {
        setTemplateId(match._id)
        setName(match.name)
        setType(match.type)
        setPurpose(match.purpose)
        setSubject(match.subject || '')
        setCc(match.cc || '')
        setBcc(match.bcc || '')
        setBody(match.body)
      } else {
        // Reset inputs for a new template configuration
        setTemplateId(null)
        setName(`Default ${matchingType ? matchingType.toUpperCase() : ''} Invitation`)
        setType(matchingType)
        setSubject('Invitation to join Workspace')
        setCc('')
        setBcc('')
        setBody(matchingType === 'email' ? DEFAULT_HTML_TEMPLATE : `Hello!\n\nYou have been invited to join our workspace. Click the link to register your account:\n\n{{invite_link}}`)
      }
    } else if (visible && availableTypes.length > 0 && templates.length === 0) {
      const defaultType = type || availableTypes[0].value
      setType(defaultType)
      setName(`Default ${defaultType.toUpperCase()} Invitation`)
      setSubject('Invitation to join Workspace')
      setCc('')
      setBcc('')
      setBody(defaultType === 'email' ? DEFAULT_HTML_TEMPLATE : `Hello!\n\nYou have been invited to join our workspace. Click the link to register your account:\n\n{{invite_link}}`)
    }
  }, [visible, templates, type, purpose, availableTypes])

  const handleSave = async (e) => {
    e.preventDefault()
    setValidationError(null)

    if (!name.trim()) {
      setValidationError('Template name is required.')
      return
    }
    if (!type) {
      setValidationError('Please select an active integration channel.')
      return
    }
    if (purpose === 'user_invitation' && !body.includes('{{invite_link}}')) {
      setValidationError('For user invitation templates, you must include the placeholder "{{invite_link}}" in the body.')
      return
    }

    setIsSubmitting(true)
    const result = await saveTemplate(templateId, {
      name,
      type,
      purpose,
      subject: type === 'email' ? subject : '',
      cc: type === 'email' ? cc : '',
      bcc: type === 'email' ? bcc : '',
      body,
    })
    setIsSubmitting(false)

    if (result.success) {
      onClose()
    } else {
      setValidationError(result.error)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg" backdrop="static" id="template-editor-modal">
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
              ⚠️ <strong>No Active Integrations:</strong> You have not configured any active SMTP, Resend, or Twilio connections in the <strong>Integration Hub</strong>. Please connect a provider first before writing custom templates.
            </CAlert>
          ) : (
            <>
              {/* Template Name & Channel Selection Row */}
              <CRow className="g-3 mb-3">
                <CCol md={6}>
                  <CFormLabel htmlFor="tmpl-name-input" className="small fw-bold">Template Label</CFormLabel>
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
                  <CFormLabel htmlFor="tmpl-type-select" className="small fw-bold">Channel Type (Integration-Derived)</CFormLabel>
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
                    <CFormLabel htmlFor="tmpl-subject-input" className="small fw-bold">Email Subject Line</CFormLabel>
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
                      <CFormLabel htmlFor="tmpl-cc-input" className="small fw-bold">CC Email Addresses (Optional)</CFormLabel>
                      <CFormInput
                        id="tmpl-cc-input"
                        type="text"
                        placeholder="e.g. manager@org.com, audit@org.com"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel htmlFor="tmpl-bcc-input" className="small fw-bold">BCC Email Addresses (Optional)</CFormLabel>
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
                <CFormLabel htmlFor="tmpl-body-textarea" className="small fw-bold">Template Body Canvas</CFormLabel>
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
                <div className="mt-2 p-2 border rounded bg-light d-flex align-items-center justify-content-between">
                  <span className="small text-secondary">
                    Required placeholder: <code className="fw-bold text-primary">{"{{invite_link}}"}</code>
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
