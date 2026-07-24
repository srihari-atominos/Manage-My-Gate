import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog';
import { Label } from 'src/components/ui/label';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
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
    setValue,
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
      await onSubmit(data);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {editingVilla ? t('villas.form.editTitle', 'Edit Unit') : t('villas.form.createTitle', 'Create Unit')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="unitNumber" className="text-sm font-semibold">
              {t('villas.form.unitNumber', 'Unit Number')} *
            </Label>
            <Input
              id="unitNumber"
              type="text"
              {...register('unitNumber')}
              className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
            {errors.unitNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.unitNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="blockOrBuilding" className="text-sm font-semibold">
              {t('villas.form.blockOrBuilding', 'Block or Building')}
            </Label>
            <Input
              id="blockOrBuilding"
              type="text"
              {...register('blockOrBuilding')}
              className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="type" className="text-sm font-semibold">
              {t('villas.form.type', 'Unit Type')}
            </Label>
            <select
              id="type"
              {...register('type')}
              className="mt-1.5 w-full rounded border border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            >
              <option value="Studio" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.types.Studio', 'Studio')}</option>
              <option value="Apartment" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.types.Apartment', 'Apartment')}</option>
              <option value="Villa" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.types.Villa', 'Villa')}</option>
              <option value="Penthouse" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.types.Penthouse', 'Penthouse')}</option>
            </select>
          </div>

          <div>
            <Label htmlFor="status" className="text-sm font-semibold">
              {t('villas.form.status', 'Occupancy Status')}
            </Label>
            <select
              id="status"
              {...register('status')}
              className="mt-1.5 w-full rounded border border-stroke bg-transparent py-2 px-3 text-sm outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
            >
              <option value="Vacant" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.statusTypes.Vacant', 'Vacant')}</option>
              <option value="Occupied" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.statusTypes.Occupied', 'Occupied')}</option>
              <option value="Under Maintenance" className="bg-white dark:bg-boxdark text-black dark:text-white">{t('villas.statusTypes.UnderMaintenance', 'Under Maintenance')}</option>
            </select>
          </div>

          <div>
            <Label htmlFor="floorAreaSqFt" className="text-sm font-semibold">
              {t('villas.form.floorArea', 'Floor Area (Sq Ft)')}
            </Label>
            <Input
              id="floorAreaSqFt"
              type="number"
              {...register('floorAreaSqFt')}
              className="mt-1.5 w-full text-sm bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
            />
            {errors.floorAreaSqFt && (
              <p className="text-red-500 text-xs mt-1">{errors.floorAreaSqFt.message}</p>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-stroke dark:border-strokedark">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              {t('villas.form.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-semibold px-4 py-2"
            >
              {isSubmitting ? t('villas.form.saving', 'Saving...') : t('villas.form.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VillaFormModal;
