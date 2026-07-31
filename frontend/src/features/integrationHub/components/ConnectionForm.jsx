import React from 'react'
import PropTypes from 'prop-types'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { CForm, CFormInput, CFormLabel, CButton, CAlert } from '@coreui/react'
import '../styles/_integrationHub.scss'

/**
 * Dynamic form for entering credentials and account label for a selected provider.
 */
export const ConnectionForm = ({ selectedProvider, onSubmit, isSubmitting, submitError }) => {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      provider: selectedProvider.id,
      accountLabel: '',
      credentials: {},
    },
  })

  const onFormSubmit = async (data) => {
    const success = await onSubmit(data)
    if (success) {
      reset()
    }
  }

  return (
    <CForm
      onSubmit={handleSubmit(onFormSubmit)}
      className="connection-form p-3 border rounded bg-body-secondary-subtle"
    >
      <h6 className="mb-3 fw-bold">{t('integrationHub.form.title', 'New Connection Details')}</h6>

      {submitError && (
        <CAlert color="danger" className="py-2">
          {submitError}
        </CAlert>
      )}

      {/* Static Account Label Field */}
      <div className="mb-3">
        <CFormLabel htmlFor="accountLabel" className="fw-semibold">
          {t('integrationHub.form.accountLabel', 'Account Label')}{' '}
          <span className="text-danger">*</span>
        </CFormLabel>
        <CFormInput
          type="text"
          id="accountLabel"
          placeholder={t('integrationHub.form.accountLabelPlaceholder', 'e.g. Twilio US Dev')}
          {...register('accountLabel', {
            required: t('integrationHub.form.accountLabelRequired', 'Account label is required'),
          })}
          invalid={!!errors.accountLabel}
          disabled={isSubmitting}
        />
        {errors.accountLabel && (
          <div className="invalid-feedback d-block mt-1">{errors.accountLabel.message}</div>
        )}
      </div>

      {/* Dynamic Fields mapping over selectedProvider.fields */}
      {selectedProvider.fields.map((field) => {
        const isRequired = field.required !== false

        return (
          <div className="mb-3" key={field.name}>
            <CFormLabel htmlFor={`credentials.${field.name}`} className="fw-semibold">
              {field.label} {isRequired && <span className="text-danger">*</span>}
            </CFormLabel>
            <CFormInput
              type={field.type || 'text'}
              id={`credentials.${field.name}`}
              placeholder={t('integrationHub.form.credentialPlaceholder', {
                defaultValue: `Enter ${field.label}`,
                fieldName: field.label,
              })}
              {...register(`credentials.${field.name}`, {
                required: isRequired
                  ? t('integrationHub.form.credentialRequired', {
                      defaultValue: `${field.label} is required`,
                      fieldName: field.label,
                    })
                  : false,
              })}
              invalid={!!errors.credentials?.[field.name]}
              disabled={isSubmitting}
            />
            {errors.credentials?.[field.name] && (
              <div className="invalid-feedback d-block mt-1">
                {errors.credentials[field.name].message}
              </div>
            )}
          </div>
        )
      })}

      <div className="d-flex justify-content-end mt-4">
        <CButton type="submit" color="primary" disabled={isSubmitting} className="px-4">
          {isSubmitting
            ? t('integrationHub.form.submitting', 'Connecting...')
            : t('integrationHub.form.submit', 'Connect')}
        </CButton>
      </div>
    </CForm>
  )
}

ConnectionForm.propTypes = {
  selectedProvider: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    fields: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
      }),
    ).isRequired,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  submitError: PropTypes.string,
}

export default ConnectionForm
