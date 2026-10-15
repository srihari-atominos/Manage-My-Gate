import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormLabel,
  CSpinner,
  CAlert,
} from '@coreui/react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import authService from '../services/authService'

const ContactChangeWizard = ({
  visible,
  onClose,
  type, // 'email' or 'phone'
  onSuccess,
}) => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // State
  const [currentOtp, setCurrentOtp] = useState('')
  const [updateAuthToken, setUpdateAuthToken] = useState(null)
  
  const [newContact, setNewContact] = useState('')
  const [newOtp, setNewOtp] = useState('')

  const handleClose = () => {
    setStep(1)
    setCurrentOtp('')
    setUpdateAuthToken(null)
    setNewContact('')
    setNewOtp('')
    setError(null)
    onClose()
  }

  const handleRequestCurrentOtp = async () => {
    setLoading(true)
    setError(null)
    try {
      await authService.requestCurrentContactOtp()
      setStep(2)
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCurrentOtp = async () => {
    if (!currentOtp) {
      setError('Please enter the OTP.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await authService.verifyCurrentContactOtp(currentOtp)
      setUpdateAuthToken(res.data.updateAuthToken)
      setStep(3)
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestNewOtp = async () => {
    if (!newContact) {
      setError(`Please enter your new ${type}.`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (type === 'email') {
        await authService.requestEmailChangeOtp(newContact)
      } else {
        await authService.requestPhoneChangeOtp(newContact)
      }
      setStep(4)
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFinalSubmit = async () => {
    if (!newOtp) {
      setError('Please enter the verification OTP.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        updateAuthToken,
      }
      if (type === 'email') {
        payload.email = newContact
        payload.emailOtp = newOtp
      } else {
        payload.phone = newContact
        payload.phoneOtp = newOtp
      }
      
      await onSuccess(payload)
      handleClose()
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CModal visible={visible} onClose={handleClose} alignment="center" backdrop="static">
      <CModalHeader>
        <CModalTitle>Change {type === 'email' ? 'Email Address' : 'Phone Number'}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && <CAlert color="danger">{error}</CAlert>}

        {step === 1 && (
          <div>
            <p>For security, we need to verify your current contact information before you can make changes.</p>
            <CButton color="primary" onClick={handleRequestCurrentOtp} disabled={loading}>
              {loading ? <CSpinner size="sm" /> : 'Send OTP to Current Contact'}
            </CButton>
          </div>
        )}

        {step === 2 && (
          <div>
            <p>Enter the OTP sent to your current email/phone.</p>
            <CFormInput
              type="text"
              placeholder="Enter 6-digit OTP"
              value={currentOtp}
              onChange={(e) => setCurrentOtp(e.target.value)}
              className="mb-3"
            />
            <CButton color="primary" onClick={handleVerifyCurrentOtp} disabled={loading}>
              {loading ? <CSpinner size="sm" /> : 'Verify'}
            </CButton>
          </div>
        )}

        {step === 3 && (
          <div>
            <p>Enter your new {type === 'email' ? 'email address' : 'phone number'}.</p>
            {type === 'email' ? (
              <CFormInput
                type="email"
                placeholder="New Email Address"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                className="mb-3"
              />
            ) : (
              <div className="mb-3">
                <PhoneInput
                  country={'in'}
                  value={newContact}
                  onChange={(phone) => setNewContact(phone)}
                  containerStyle={{ width: '100%' }}
                  inputStyle={{ width: '100%', height: '38px', borderRadius: '0.375rem' }}
                />
              </div>
            )}
            <CButton color="primary" onClick={handleRequestNewOtp} disabled={loading}>
              {loading ? <CSpinner size="sm" /> : 'Send Verification OTP'}
            </CButton>
          </div>
        )}

        {step === 4 && (
          <div>
            <p>Enter the verification OTP sent to your NEW {type === 'email' ? 'email' : 'phone'}.</p>
            <CFormInput
              type="text"
              placeholder="Enter 6-digit OTP"
              value={newOtp}
              onChange={(e) => setNewOtp(e.target.value)}
              className="mb-3"
            />
            <CButton color="primary" onClick={handleFinalSubmit} disabled={loading}>
              {loading ? <CSpinner size="sm" /> : 'Update Profile'}
            </CButton>
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

ContactChangeWizard.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['email', 'phone']).isRequired,
  onSuccess: PropTypes.func.isRequired,
}

export default ContactChangeWizard
