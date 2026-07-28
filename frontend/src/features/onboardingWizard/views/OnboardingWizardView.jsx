import React from 'react'
import { CButton, CCard, CCardBody } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilCloudUpload, cilPlus } from '@coreui/icons'
import { useOnboardingWizard } from '../hooks/useOnboardingWizard.js'
import FileUploadZone from '../components/FileUploadZone.jsx'
import ValidationSummary from '../components/ValidationSummary.jsx'
import DataPreviewTable from '../components/DataPreviewTable.jsx'
import '../styles/_onboardingWizard.scss'

const OnboardingWizardView = () => {
  const {
    step,
    validationResults,
    isImporting,
    loading,
    error,
    importResult,
    handleFileUpload,
    handleConfirmImport,
    resetWizard,
  } = useOnboardingWizard()

  const invalidRows = validationResults?.invalid || []
  const validRows = validationResults?.valid || []
  const hasErrors = invalidRows.length > 0

  return (
    <div className="onboarding-wizard-container">
      {/* Wizard Page Header */}
      <div className="wizard-header">
        <h1 className="wizard-title">Community Onboarding Wizard</h1>
        <p className="wizard-subtitle">
          Bulk import villas, units, and resident owner profiles into your community using CSV or
          Excel spreadsheets.
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div className="wizard-steps-nav">
        <div className={`step-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <div className="step-badge">1</div>
          <div className="step-label">Upload File</div>
        </div>

        <div className={`step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <div className="step-badge">2</div>
          <div className="step-label">Validation & Preview</div>
        </div>

        <div className={`step-item ${step === 3 ? 'active completed' : ''}`}>
          <div className="step-badge">3</div>
          <div className="step-label">Import Complete</div>
        </div>
      </div>

      {/* Step 1: File Upload */}
      {step === 1 && (
        <FileUploadZone handleFileUpload={handleFileUpload} loading={loading} error={error} />
      )}

      {/* Step 2: Validation Results / Preview */}
      {step === 2 && (
        <>
          {hasErrors ? (
            <ValidationSummary validationResults={validationResults} resetWizard={resetWizard} />
          ) : (
            <DataPreviewTable
              validRows={validRows}
              handleConfirmImport={handleConfirmImport}
              isImporting={isImporting}
              resetWizard={resetWizard}
            />
          )}
        </>
      )}

      {/* Step 3: Success Screen */}
      {step === 3 && (
        <div className="import-success-card">
          <CIcon icon={cilCheckCircle} className="success-icon" />
          <h2 className="success-title">Database Import Successful!</h2>
          <p className="success-message">
            Successfully created {importResult?.importedCount || validRows.length} unit and resident
            record(s) in a single transactional operation.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <CButton color="primary" size="lg" onClick={resetWizard}>
              <CIcon icon={cilPlus} className="me-2" /> Import Another Batch
            </CButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default OnboardingWizardView
