import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormFeedback
} from '@coreui/react';
import { useTranslation } from 'react-i18next';

// Validation Schema
const schema = yup.object().shape({
  unitNumber: yup.string().required('Unit number is required').trim(),
  blockOrBuilding: yup.string().optional(),
  type: yup.string().oneOf(['Studio', 'Apartment', 'Villa', 'Penthouse'], 'Invalid type').default('Apartment'),
  status: yup.string().oneOf(['Vacant', 'Occupied', 'Under Maintenance'], 'Invalid status').default('Vacant'),
  floorAreaSqFt: yup
    .number()
    .transform((value, originalValue) => (String(originalValue).trim() === '' ? null : value))
    .nullable()
    .moreThan(0, 'Floor area must be a positive number')
    .optional(),
});

export const VillaFormModal = ({ visible, onClose, onSubmit, editingVilla }) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      unitNumber: '',
      blockOrBuilding: '',
      type: 'Apartment',
      status: 'Vacant',
      floorAreaSqFt: '',
    }
  });

  // Reset form when editing unit changes
  useEffect(() => {
    if (editingVilla) {
      reset({
        unitNumber: editingVilla.unitNumber || '',
        blockOrBuilding: editingVilla.blockOrBuilding || '',
        type: editingVilla.type || 'Apartment',
        status: villaStatusMapBack(editingVilla.status),
        floorAreaSqFt: editingVilla.floorAreaSqFt || '',
      });
    } else {
      reset({
        unitNumber: '',
        blockOrBuilding: '',
        type: 'Apartment',
        status: 'Vacant',
        floorAreaSqFt: '',
      });
    }
  }, [editingVilla, reset]);

  // Map legacy occupancyStatus field to DB status if editing
  const villaStatusMapBack = (status) => {
    if (status === 'Owner Occupied' || status === 'Tenant Occupied') {
      return 'Occupied';
    }
    return status || 'Vacant';
  };

  const handleFormSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (payload.floorAreaSqFt === '') {
        payload.floorAreaSqFt = null;
      }
      if (payload.blockOrBuilding === '') {
        payload.blockOrBuilding = null;
      }
      await onSubmit(payload);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      className="villa-form-modal"
    >
      <CModalHeader>
        <CModalTitle className="modal-title-bold">
          {editingVilla ? t('villas.form.editTitle', 'Edit Unit') : t('villas.form.createTitle', 'Create Unit')}
        </CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit(handleFormSubmit)}>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel htmlFor="unitNumber" className="small fw-semibold">
              {t('villas.form.unitNumber', 'Unit Number')} *
            </CFormLabel>
            <CFormInput
              id="unitNumber"
              type="text"
              {...register('unitNumber')}
              invalid={!!errors.unitNumber}
              size="sm"
            />
            {errors.unitNumber && (
              <CFormFeedback invalid>{errors.unitNumber.message}</CFormFeedback>
            )}
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="blockOrBuilding" className="small fw-semibold">
              {t('villas.form.blockOrBuilding', 'Block or Building')}
            </CFormLabel>
            <CFormInput
              id="blockOrBuilding"
              type="text"
              {...register('blockOrBuilding')}
              invalid={!!errors.blockOrBuilding}
              size="sm"
            />
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="type" className="small fw-semibold">
              {t('villas.form.type', 'Unit Type')}
            </CFormLabel>
            <CFormSelect id="type" {...register('type')} invalid={!!errors.type} size="sm">
              <option value="Studio">{t('villas.types.Studio', 'Studio')}</option>
              <option value="Apartment">{t('villas.types.Apartment', 'Apartment')}</option>
              <option value="Villa">{t('villas.types.Villa', 'Villa')}</option>
              <option value="Penthouse">{t('villas.types.Penthouse', 'Penthouse')}</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="status" className="small fw-semibold">
              {t('villas.form.status', 'Occupancy Status')}
            </CFormLabel>
            <CFormSelect id="status" {...register('status')} invalid={!!errors.status} size="sm">
              <option value="Vacant">{t('villas.statusTypes.Vacant', 'Vacant')}</option>
              <option value="Occupied">{t('villas.statusTypes.Occupied', 'Occupied')}</option>
              <option value="Under Maintenance">{t('villas.statusTypes.UnderMaintenance', 'Under Maintenance')}</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="floorAreaSqFt" className="small fw-semibold">
              {t('villas.form.floorArea', 'Floor Area (Sq Ft)')}
            </CFormLabel>
            <CFormInput
              id="floorAreaSqFt"
              type="number"
              {...register('floorAreaSqFt')}
              invalid={!!errors.floorAreaSqFt}
              size="sm"
            />
            {errors.floorAreaSqFt && (
              <CFormFeedback invalid>{errors.floorAreaSqFt.message}</CFormFeedback>
            )}
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            {t('villas.form.cancel', 'Cancel')}
          </CButton>
          <CButton color="primary" size="sm" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('villas.form.saving', 'Saving...') : t('villas.form.save', 'Save')}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
};

VillaFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  editingVilla: PropTypes.object,
};

export default VillaFormModal;
