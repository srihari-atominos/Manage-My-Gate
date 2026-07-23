import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getConnections } from '../../integrationHub/store/integrationHubSlice.js'
import useMessageTemplates from './useMessageTemplates'

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

export const useTemplateEditorCanvas = (visible, onClose) => {
  const dispatch = useDispatch()
  const { templates = [], isLoading, error: apiError, loadTemplates, saveTemplate } = useMessageTemplates()

  const { connections = [], isLoading: isHubLoading = false } = useSelector(
    (state) => state.integrationHub || {}
  )

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
  const availableTypes = useMemo(() => {
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

  return {
    templates,
    isLoading,
    apiError,
    connections,
    isHubLoading,
    availableTypes,
    templateId,
    name,
    setName,
    type,
    setType,
    purpose,
    setPurpose,
    subject,
    setSubject,
    cc,
    setCc,
    bcc,
    setBcc,
    body,
    setBody,
    validationError,
    setValidationError,
    isSubmitting,
    handleSave,
  }
}

export default useTemplateEditorCanvas
