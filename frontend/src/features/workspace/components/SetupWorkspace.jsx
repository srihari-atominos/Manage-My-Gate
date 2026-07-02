import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CButton,
  CAlert,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilHome } from '@coreui/icons';
import useSetupWorkspace from '../hooks/useSetupWorkspace.js';

/**
 * SetupWorkspace Component
 * 
 * Simplified, decoupled view for organization/workspace creation.
 * Implements 500ms debounced live organization name availability validation.
 * Adheres to the "Thin View" architectural pattern.
 */
export const SetupWorkspace = () => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    errors,
    loading,
    error,
    checking,
    isAvailable,
    checkError,
    isSubmitDisabled,
    onSubmit,
  } = useSetupWorkspace();

  return (
    <div className="setup-workspace bg-light min-vh-100 d-flex flex-row align-items-center" style={styles.pageBackground}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-7 col-lg-6 col-xl-5">
            <CCard style={styles.card}>
              <CCardBody style={styles.cardBody}>
                <CForm onSubmit={handleSubmit(onSubmit)}>
                  <div className="text-center mb-4">
                    <h2 style={styles.title}>
                      {t('workspace.setup.title', { defaultValue: 'Create Your Organization' })}
                    </h2>
                    <p style={styles.subtitle}>
                      {t('workspace.setup.subtitle', { defaultValue: 'Establish your enterprise workspace environment' })}
                    </p>
                  </div>

                  {error && (
                    <CAlert color="danger" style={styles.alert}>
                      {error}
                    </CAlert>
                  )}

                  <div className="mb-3">
                    <CInputGroup>
                      <CInputGroupText style={styles.inputIconText}>
                        <CIcon icon={cilHome} style={styles.icon} />
                      </CInputGroupText>
                      <CFormInput
                        style={styles.input}
                        placeholder={t('workspace.setup.namePlaceholder', { defaultValue: 'Organization Name' })}
                        disabled={loading}
                        {...register('name', {
                          required: t('workspace.setup.nameRequired', { defaultValue: 'Organization name is required.' }),
                          minLength: {
                            value: 3,
                            message: t('workspace.setup.nameLength', { defaultValue: 'Organization name must be at least 3 characters.' }),
                          },
                        })}
                      />
                    </CInputGroup>
                    {errors.name && (
                      <div className="text-danger small mt-1 ms-1">{errors.name.message}</div>
                    )}

                    {/* Live Validation Feedback */}
                    <div className="mt-2 ms-1" style={styles.feedbackContainer}>
                      {checking && (
                        <span style={styles.checkingText}>
                          <CSpinner size="sm" variant="grow" className="me-2" style={styles.spinner} />
                          {t('workspace.setup.checking', { defaultValue: 'Checking name availability...' })}
                        </span>
                      )}
                      {!checking && isAvailable === true && (
                        <span style={styles.availableText}>
                          ✓ {t('workspace.setup.available', { defaultValue: 'Name is available' })}
                        </span>
                      )}
                      {!checking && isAvailable === false && !checkError && (
                        <span style={styles.unavailableText}>
                          ✗ {t('workspace.setup.taken', { defaultValue: 'Organization name is already taken' })}
                        </span>
                      )}
                      {checkError && (
                        <span style={styles.unavailableText}>
                          ✗ {checkError}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="d-grid mt-4">
                    <CButton
                      type="submit"
                      color="primary"
                      style={isSubmitDisabled ? styles.submitButtonDisabled : styles.submitButton}
                      disabled={isSubmitDisabled}
                    >
                      {loading ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          {t('workspace.setup.loading', { defaultValue: 'Creating Workspace...' })}
                        </>
                      ) : (
                        t('workspace.setup.submit', { defaultValue: 'Create Organization' })
                      )}
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageBackground: {
    backgroundColor: '#0b0f19',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
  },
  card: {
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    padding: '24px 16px',
    color: '#ffffff',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '-0.025em',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: '15px',
  },
  inputIconText: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#a1a1aa',
    minWidth: '50px',
    justifyContent: 'center',
  },
  icon: {
    width: '18px',
    height: '18px',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    padding: '12px',
  },
  feedbackContainer: {
    minHeight: '24px',
    fontSize: '14px',
    fontWeight: '500',
  },
  checkingText: {
    color: '#60a5fa',
    display: 'flex',
    alignItems: 'center',
  },
  spinner: {
    width: '14px',
    height: '14px',
  },
  availableText: {
    color: '#34d399',
  },
  unavailableText: {
    color: '#f87171',
  },
  alert: {
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    color: '#ffffff',
    transition: 'all 0.2s',
  },
  submitButtonDisabled: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.3)',
    cursor: 'not-allowed',
  },
};

export default SetupWorkspace;
