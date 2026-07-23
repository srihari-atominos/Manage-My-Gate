import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CSpinner, CAlert, CCard, CCardBody, CContainer, CRow, CCol } from '@coreui/react'
import apiClient from '../../../services/apiClient.js'

/**
 * InviteHandler Component
 * 
 * Intercepts incoming /#/invite?token=... links, validates the token
 * with the backend, and routes the user based on whether they already exist:
 * - Existing users -> /login?invite_token=...&email=...
 * - New pending users -> /accept-invite?token=...
 */
const InviteHandler = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.')
      setLoading(false)
      return
    }

    let isMounted = true

    const validateToken = async () => {
      try {
        const response = await apiClient.get('/auth/validate-invite', {
          params: { token },
        })

        if (!isMounted) return

        const data = response.data?.data || response.data

        if (data && data.valid) {
          if (data.isExisting) {
            const encodedEmail = encodeURIComponent(data.email || '')
            navigate(`/login?invite_token=${token}&email=${encodedEmail}`, { replace: true })
          } else {
            navigate(`/accept-invite?token=${token}`, { replace: true })
          }
        } else {
          setError('Invalid or expired invitation token.')
          setLoading(false)
        }
      } catch (err) {
        if (!isMounted) return
        const errorMessage = err.response?.data?.message || 'Invalid or expired invitation token.'
        setError(errorMessage)
        setLoading(false)
      }
    }

    validateToken()

    return () => {
      isMounted = false
    }
  }, [token, navigate])

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-row align-items-center justify-content-center bg-dark text-white">
        <div className="text-center">
          <CSpinner color="primary" variant="grow" className="mb-3" />
          <h5>Validating invitation link...</h5>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 d-flex flex-row align-items-center bg-dark">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <CCard className="border-0 shadow-lg">
              <CCardBody className="p-4 text-center">
                <h3 className="text-danger fw-bold mb-3">Invitation Error</h3>
                <CAlert color="danger" className="mb-4">
                  {error || 'Invalid or expired invitation token.'}
                </CAlert>
                <Link to="/login" className="btn btn-primary px-4">
                  Go to Login
                </Link>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default InviteHandler
