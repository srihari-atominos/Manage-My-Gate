import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormSelect,
  CButton,
  CFormFeedback,
  CSpinner,
  CAlert,
  CRow,
  CCol,
} from '@coreui/react';
import '../styles/_integrationHub.scss';

/**
 * Yup validation schema for Indian Bank Account & Gateway Credential management
 */
const bankDetailsSchema = yup.object().shape({
  accountHolderName: yup
    .string()
    .required('Account holder name is required')
    .min(2, 'Name must be at least 2 characters'),
  bankName: yup
    .string()
    .required('Bank name is required'),
  accountNumber: yup
    .string()
    .required('Account number is required')
    .matches(/^\d{9,18}$/, 'Must be a valid Indian bank account number (9 to 18 digits)'),
  ifscCode: yup
    .string()
    .required('IFSC code is required')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Must be a valid Indian IFSC code (e.g. SBIN0001234)'),
  accountType: yup
    .string()
    .oneOf(['Savings', 'Current'], 'Select account type')
    .required('Account type is required'),
  razorpayKeyId: yup.string().nullable(),
  razorpayKeySecret: yup.string().nullable(),
});

/**
 * Dumb Form Modal Component for Bank Details & Gateway Credentials.
 * Uses React Hook Form with Yup validation schema and logical utility classes for RTL compliance.
 */
export const BankDetailsFormModal = ({
  isOpen,
  onClose,
  initialValues,
  onSubmit,
  isLoading,
  actionError,
}) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(bankDetailsSchema),
    defaultValues: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountType: 'Current',
      razorpayKeyId: '',
      razorpayKeySecret: '',
    },
  });

  // Populate form with initialValues when modal opens or initialValues change
  useEffect(() => {
    if (isOpen) {
      reset({
        accountHolderName: initialValues?.accountHolderName || '',
        bankName: initialValues?.bankName || '',
        accountNumber: initialValues?.accountNumber || '',
        ifscCode: initialValues?.ifscCode || '',
        accountType: initialValues?.accountType || 'Current',
        razorpayKeyId: initialValues?.razorpayKeyId || '',
        razorpayKeySecret: initialValues?.razorpayKeySecret || '',
      });
    }
  }, [isOpen, initialValues, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <CModal
      visible={isOpen}
      onClose={onClose}
      backdrop="static"
      alignment="center"
      size="lg"
      className="bank-details-modal"
    >
      <CModalHeader closeButton>
        <CModalTitle className="fw-bold">
          {t('integrationHub.bankModal.title', 'Bank Account & Gateway Credentials')}
        </CModalTitle>
      </CModalHeader>

      <CForm onSubmit={handleSubmit(handleFormSubmit)}>
        <CModalBody className="p-4">
          {actionError && (
            <CAlert color="danger" className="mb-4">
              {actionError}
            </CAlert>
          )}

          {/* Section 1: Bank Account Details */}
          <h6 className="fw-bold mb-3 border-bottom pb-2 text-start">
            {t('integrationHub.bankModal.bankSectionTitle', 'Bank Account Information')}
          </h6>

          <CRow className="g-3 mb-3">
            <CCol xs={12} md={6}>
              <label className="form-label fw-medium text-start w-100">
                {t('integrationHub.bankModal.accountHolderName', 'Account Holder Name')}{' '}
                <span className="text-danger">*</span>
              </label>
              <CFormInput
                type="text"
                placeholder={t('integrationHub.bankModal.accountHolderPlaceholder', 'e.g. Apex Resident Association')}
                invalid={!!errors.accountHolderName}
                {...register('accountHolderName')}
              />
              {errors.accountHolderName && (
                <CFormFeedback invalid className="text-start">
                  {t(`integrationHub.bankModal.errors.${errors.accountHolderName.message}`, errors.accountHolderName.message)}
                </CFormFeedback>
              )}
            </CCol>

            <CCol xs={12} md={6}>
              <label className="form-label fw-medium text-start w-100">
                {t('integrationHub.bankModal.bankName', 'Bank Name')}{' '}
                <span className="text-danger">*</span>
              </label>
              <CFormInput
                type="text"
                placeholder={t('integrationHub.bankModal.bankNamePlaceholder', 'e.g. State Bank of India')}
                invalid={!!errors.bankName}
                {...register('bankName')}
              />
              {errors.bankName && (
                <CFormFeedback invalid className="text-start">
                  {t(`integrationHub.bankModal.errors.${errors.bankName.message}`, errors.bankName.message)}
                </CFormFeedback>
              )}
            </CCol>
          </CRow>

          <CRow className="g-3 mb-3">
            <CCol xs={12} md={6}>
              <label className="form-label fw-medium text-start w-100">
                {t('integrationHub.bankModal.accountNumber', 'Account Number')}{' '}
                <span className="text-danger">*</span>
              </label>
              <CFormInput
                type="text"
                placeholder={t('integrationHub.bankModal.accountNumberPlaceholder', 'e.g. 123456789012')}
                invalid={!!errors.accountNumber}
                {...register('accountNumber')}
              />
              {errors.accountNumber && (
                <CFormFeedback invalid className="text-start">
                  {t(`integrationHub.bankModal.errors.${errors.accountNumber.message}`, errors.accountNumber.message)}
                </CFormFeedback>
              )}
            </CCol>

            <CCol xs={12} md={6}>
              <label className="form-label fw-medium text-start w-100">
                {t('integrationHub.bankModal.ifscCode', 'IFSC Code')}{' '}
                <span className="text-danger">*</span>
              </label>
              <CFormInput
                type="text"
                placeholder={t('integrationHub.bankModal.ifscPlaceholder', 'e.g. SBIN0001234')}
                invalid={!!errors.ifscCode}
                {...register('ifscCode')}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
              />
              {errors.ifscCode && (
                <CFormFeedback invalid className="text-start">
                  {t(`integrationHub.bankModal.errors.${errors.ifscCode.message}`, errors.ifscCode.message)}
                </CFormFeedback>
              )}
            </CCol>
          </CRow>

          <CRow className="g-3 mb-4">
            <CCol xs={12} md={6}>
              <label className="form-label fw-medium text-start w-100">
                {t('integrationHub.bankModal.accountType', 'Account Type')}{' '}
                <span className="text-danger">*</span>
              </label>
              <CFormSelect
                invalid={!!errors.accountType}
                {...register('accountType')}
              >
                <option value="Current">{t('integrationHub.bankModal.accountTypeCurrent', 'Current Account')}</option>
                <option value="Savings">{t('integrationHub.bankModal.accountTypeSavings', 'Savings Account')}</option>
              </CFormSelect>
              {errors.accountType && (
                <CFormFeedback invalid className="text-start">
                  {errors.accountType.message}
                </CFormFeedback>
              )}
            </CCol>
          </CRow>

          {/* Section 2: Payment Gateway Credentials */}
          <h6 className="fw-bold mb-3 border-bottom pb-2 text-start">
            {t('integrationHub.bankModal.gatewaySectionTitle', 'Razorpay Merchant API Credentials')}
          </h6>

          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <label className="form-label fw-medium text-start w-100">
                {t('integrationHub.bankModal.razorpayKeyId', 'Razorpay Key ID')}
              </label>
              <CFormInput
                type="text"
                placeholder={t('integrationHub.bankModal.keyIdPlaceholder', 'rzp_live_xxxxxxxxxxxxx')}
                invalid={!!errors.razorpayKeyId}
                {...register('razorpayKeyId')}
              />
            </CCol>

            <CCol xs={12} md={6}>
              <label className="form-label fw-medium text-start w-100">
                {t('integrationHub.bankModal.razorpayKeySecret', 'Razorpay Key Secret')}
              </label>
              <CFormInput
                type="password"
                placeholder={t('integrationHub.bankModal.keySecretPlaceholder', '••••••••••••••••')}
                invalid={!!errors.razorpayKeySecret}
                {...register('razorpayKeySecret')}
              />
            </CCol>
          </CRow>
        </CModalBody>

        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={isLoading}>
            {t('integrationHub.bankModal.cancel', 'Cancel')}
          </CButton>
          <CButton color="primary" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <CSpinner size="sm" aria-hidden="true" className="me-2" />
                {t('integrationHub.bankModal.saving', 'Saving...')}
              </>
            ) : (
              t('integrationHub.bankModal.save', 'Save Configuration')
            )}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
};

BankDetailsFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialValues: PropTypes.shape({
    accountHolderName: PropTypes.string,
    bankName: PropTypes.string,
    accountNumber: PropTypes.string,
    ifscCode: PropTypes.string,
    accountType: PropTypes.string,
    razorpayKeyId: PropTypes.string,
    razorpayKeySecret: PropTypes.string,
  }),
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  actionError: PropTypes.string,
};

BankDetailsFormModal.defaultProps = {
  initialValues: null,
  isLoading: false,
  actionError: null,
};

export default BankDetailsFormModal;
